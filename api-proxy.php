<?php
// Simple API proxy for environments without mod_proxy
// Forwards requests from /api/* to http://localhost:5000/api/*

$api_base = 'http://localhost:5000';
$request_uri = $_SERVER['REQUEST_URI'];

// Extract the API path (everything after /api)
if (preg_match('#^/api/(.*)$#', $request_uri, $matches)) {
    $api_path = '/api/' . $matches[1];
    $url = $api_base . $api_path;

    // Include query string if present
    if (!empty($_SERVER['QUERY_STRING'])) {
        $url .= '?' . $_SERVER['QUERY_STRING'];
    }

    // Initialize cURL
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);

    // Forward request method
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

    // Forward request body for POST, PUT, PATCH
    if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {
        $body = file_get_contents('php://input');
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    }

    // Forward headers (excluding host)
    $headers = [];
    foreach (getallheaders() as $key => $value) {
        if (strtolower($key) !== 'host' && strtolower($key) !== 'connection') {
            $headers[] = "$key: $value";
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    // Execute request
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    // Set response status and headers
    http_response_code($status);
    if ($content_type) {
        header('Content-Type: ' . $content_type);
    }

    // Output response
    echo $response;
} else {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Not found']);
}
?>
