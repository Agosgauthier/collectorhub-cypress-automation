<?php
require __DIR__ . '/notifications-bootstrap.php';

function e2eEmails(string $context): array
{
    $emails = [];
    foreach (['receiver', 'sender', 'other'] as $role) {
        $emails[$role] = "notifications-$context-$role@example.test";
    }
    return $emails;
}

// Read raw BSON values: Eloquent's array cast hides serialized JSON on reads.
// This inventory is shared by preparation, inspection and cleanup.
function e2eInventory($database, string $context): array
{
    $emails = e2eEmails($context);
    $options = ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];
    $users = $database->selectCollection('users')->find(['$or' => [
        ['email' => ['$in' => array_values($emails)]], ['e2e_context' => $context],
    ]], $options + ['projection' => ['_id' => 1, 'email' => 1, 'e2e_context' => 1]])->toArray();
    $roles = [];
    $ownedUsers = [];
    $conflicts = [];
    foreach ($users as $user) {
        $role = array_search($user['email'] ?? null, $emails, true);
        if ($role === false || ($user['e2e_context'] ?? null) !== $context || isset($roles[$role])) {
            $conflicts[] = 'USER_OWNERSHIP_MISMATCH';
            continue;
        }
        $roles[$role] = (string) $user['_id'];
        $ownedUsers[] = $user;
    }
    $userIds = array_map(fn ($user) => (string) $user['_id'], $users);
    $documents = $database->selectCollection('notifications')->find(['$or' => [
        ['e2e_context' => $context], ['data.e2e_context' => $context],
        ['data' => ['$regex' => '"e2e_context"\s*:\s*"' . $context . '"']],
        ['receiver_id' => ['$in' => $userIds]], ['sender_id' => ['$in' => $userIds]],
    ]], $options)->toArray();
    $expectedTypes = ['follow' => 'FOLLOW', 'message-unread' => 'MESSAGE',
        'message-read' => 'MESSAGE', 'marketplace' => 'MARKETPLACE_MESSAGE', 'other-follow' => 'FOLLOW'];
    $owned = [];
    $tagged = 0;
    $seenKeys = [];
    foreach ($documents as $document) {
        $raw = $document['data'] ?? null;
        $data = is_string($raw) ? json_decode($raw, true) : $raw;
        $validData = is_array($data);
        $data = $validData ? $data : [];
        $topContext = $document['e2e_context'] ?? null;
        $dataContext = $data['e2e_context'] ?? null;
        if ($topContext === $context || $dataContext === $context) $tagged++;
        $key = $document['e2e_key'] ?? $data['e2e_key'] ?? null;
        $receiverRole = $key === 'other-follow' ? 'other' : 'receiver';
        $safe = $validData && ($topContext === $context || $dataContext === $context)
            && ($topContext === null || $topContext === $context)
            && ($dataContext === null || $dataContext === $context)
            && is_string($key) && isset($expectedTypes[$key])
            && (!isset($document['e2e_key'], $data['e2e_key']) || $document['e2e_key'] === $data['e2e_key'])
            && ($document['type'] ?? null) === ($expectedTypes[$key] ?? null)
            && isset($roles[$receiverRole], $roles['sender'])
            && ($document['receiver_id'] ?? null) === $roles[$receiverRole]
            && ($document['sender_id'] ?? null) === $roles['sender']
            && ($document['reference_id'] ?? null) === null;
        if (!$safe || isset($seenKeys[$key])) {
            $conflicts[] = 'NOTIFICATION_OWNERSHIP_MISMATCH';
            continue;
        }
        $seenKeys[$key] = true;
        $owned[] = ['document' => $document, 'key' => $key];
    }
    return ['users' => $users, 'ownedUsers' => $ownedUsers, 'documents' => $documents,
        'owned' => $owned, 'tagged' => $tagged, 'conflicts' => array_values(array_unique($conflicts))];
}

function e2eInspection(array $inventory, string $context): array
{
    return ['context' => $context, 'database' => 'coleccionistas_e2e', 'readOnly' => true,
        // Existing spec contract: userCount means validated test users.
        'userCount' => count($inventory['ownedUsers']),
        'candidateUserCount' => count($inventory['users']),
        'notificationCount' => count($inventory['documents']),
        'taggedNotificationCount' => $inventory['tagged'],
        'eligibleNotificationCount' => count($inventory['owned']),
        'conflicts' => $inventory['conflicts'],
        'notifications' => array_map(fn ($item) => [
            'id' => (string) $item['document']['_id'], 'key' => $item['key'],
            'receiver_id' => $item['document']['receiver_id'], 'type' => $item['document']['type'],
            'is_read' => (bool) ($item['document']['is_read'] ?? false),
            'rawDataType' => get_debug_type($item['document']['data'] ?? null),
        ], $inventory['owned'])];
}

try {
    $operation = $argv[1] ?? '';
    if (!in_array($operation, ['check', 'prepare', 'inspect', 'cleanup'], true)) {
        throw new RuntimeException('INVALID_OPERATION');
    }
    $input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
    [$app, $connection, $state] = e2eBootstrap();
    e2eVerifyProof($input, $state);
    $database = $connection->getDatabase();
    $database->command(['ping' => 1])->toArray();
    if ($operation === 'check') {
        echo json_encode(['ok' => true, 'database' => $state['database'],
            'connection' => 'mongodb', 'serverVerified' => true, 'readOnly' => true,
            'writesEnabled' => getenv('E2E_ALLOW_WRITES') === 'YES'], JSON_THROW_ON_ERROR);
        exit;
    }
    $context = $input['context'] ?? '';
    if (!is_string($context) || !preg_match('/^[a-f0-9]{32}$/D', $context)) {
        throw new RuntimeException('INVALID_CONTEXT');
    }
    if (in_array($operation, ['prepare', 'cleanup'], true) && getenv('E2E_ALLOW_WRITES') !== 'YES') {
        throw new RuntimeException('WRITES_DISABLED');
    }
    $inventory = e2eInventory($database, $context);
    if ($operation === 'prepare') {
        $scenario = $input['scenario'] ?? '';
        if (!in_array($scenario, ['empty', 'mixed'], true)) throw new RuntimeException('INVALID_SCENARIO');
        if ($inventory['users'] || $inventory['documents']) throw new RuntimeException('CONTEXT_EXISTS');
        $emails = e2eEmails($context);
        $users = [];
        foreach ($emails as $role => $email) {
            $user = new App\Models\User();
            $user->forceFill(['nombre' => 'E2E ' . $role . ' ' . $context, 'email' => $email,
                'password' => 'E2E-Notifications!2026', 'rol' => 'usuario',
                'bloqueados' => [], 'e2e_context' => $context]);
            $user->save();
            $users[$role] = $user;
        }
        $records = $scenario === 'mixed'
            ? [['follow', 'FOLLOW', false], ['message-unread', 'MESSAGE', false],
               ['message-read', 'MESSAGE', true], ['marketplace', 'MARKETPLACE_MESSAGE', false]] : [];
        $ids = [];
        foreach (array_merge($records, [['other-follow', 'FOLLOW', false]]) as [$key, $type, $read]) {
            $receiver = $users[$key === 'other-follow' ? 'other' : 'receiver'];
            $notification = new App\Models\Notification();
            $notification->forceFill(['receiver_id' => (string) $receiver->_id,
                'sender_id' => (string) $users['sender']->_id, 'reference_id' => null,
                'type' => $type, 'is_read' => $read,
                // Native top-level markers avoid querying inside serialized JSON.
                'e2e_context' => $context, 'e2e_key' => $key,
                'data' => ['e2e_context' => $context, 'e2e_key' => $key,
                    'message_preview' => 'E2E ' . $key, 'post_title' => 'E2E Marketplace',
                    'listing_type' => 'venta', 'price' => 100, 'currency' => 'ARS']]);
            $notification->save();
            $ids[$key] = (string) $notification->_id;
        }
        $prepared = e2eInventory($database, $context);
        $expected = count($records) + 1;
        if (count($prepared['ownedUsers']) !== 3 || count($prepared['owned']) !== $expected
            || $prepared['tagged'] !== $expected || $prepared['conflicts']) {
            throw new RuntimeException('PREPARE_VERIFICATION_FAILED');
        }
        $result = ['context' => $context, 'scenario' => $scenario, 'notificationIds' => $ids,
            'email' => $emails['receiver'], 'password' => 'E2E-Notifications!2026'];
    } elseif ($operation === 'cleanup') {
        // Complete preflight before any deletion. Related but unowned records block cleanup.
        if ($inventory['conflicts'] || count($inventory['owned']) !== count($inventory['documents'])
            || count($inventory['ownedUsers']) !== count($inventory['users'])) {
            throw new RuntimeException('UNSAFE_RECORDS');
        }
        $deletedNotifications = 0;
        foreach ($inventory['owned'] as $item) {
            $document = $item['document'];
            // Compare the snapshot as well as ID and ownership: fail if it changed.
            $filter = [];
            foreach (['_id', 'receiver_id', 'sender_id', 'type', 'data', 'is_read',
                'reference_id', 'e2e_context', 'e2e_key'] as $field) {
                $filter[$field] = array_key_exists($field, $document)
                    ? $document[$field] : ['$exists' => false];
            }
            $count = $database->selectCollection('notifications')->deleteOne($filter)->getDeletedCount();
            if ($count !== 1) throw new RuntimeException('RECORD_CHANGED');
            $deletedNotifications += $count;
        }
        $deletedUsers = 0;
        foreach ($inventory['ownedUsers'] as $user) {
            $id = (string) $user['_id'];
            if ($database->selectCollection('notifications')->countDocuments(['$or' => [
                ['receiver_id' => $id], ['sender_id' => $id],
            ]]) !== 0) throw new RuntimeException('UNOWNED_REFERENCES');
            $count = $database->selectCollection('users')->deleteOne([
                '_id' => $user['_id'], 'email' => $user['email'], 'e2e_context' => $context,
            ])->getDeletedCount();
            if ($count !== 1) throw new RuntimeException('RECORD_CHANGED');
            $deletedUsers += $count;
        }
        $remaining = e2eInventory($database, $context);
        $result = ['deletedUsers' => $deletedUsers, 'deletedNotifications' => $deletedNotifications,
            'remainingUsers' => count($remaining['users']),
            'remainingNotifications' => count($remaining['documents'])];
        if ($result['remainingUsers'] || $result['remainingNotifications']) {
            throw new RuntimeException('CLEANUP_INCOMPLETE');
        }
    } else {
        $result = e2eInspection($inventory, $context);
    }
    echo json_encode(['ok' => true] + $result, JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    $safeCodes = ['INVALID_OPERATION', 'INVALID_CONTEXT', 'WRITES_DISABLED', 'INVALID_SCENARIO',
        'CONTEXT_EXISTS', 'PREPARE_VERIFICATION_FAILED', 'UNSAFE_RECORDS', 'RECORD_CHANGED',
        'UNOWNED_REFERENCES', 'CLEANUP_INCOMPLETE'];
    $code = in_array($error->getMessage(), $safeCodes, true) ? $error->getMessage() : 'ENVIRONMENT_OR_DATABASE_ERROR';
    // Only allowlisted codes; never forward connection exceptions or credentials.
    echo json_encode(['ok' => false, 'errorCode' => $code,
        'error' => 'E2E operation failed: ' . $code . '. Inspect this context before any retry.']);
}
