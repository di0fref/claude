<?php
// Simple API proxy for environments without mod_proxy
// Forwards requests from /api/* to http://localhost:5000/api/*

// Use Unix socket if available, otherwise TCP
$socket_path = __DIR__ . '/baletracker.sock';
if (file_exists($socket_path)) {
    $api_base = 'http://localhost'; // Will use UNIX_SOCKET_PATH
    $use_socket = true;
} else {
    $api_base = 'http://127.0.0.1:5000';
    $use_socket = false;
}
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

    // Use Unix socket if available
    if ($use_socket) {
        curl_setopt($ch, CURLOPT_UNIX_SOCKET_PATH, $socket_path);
    }

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

    // getallheaders() may not be available, use $_SERVER as fallback
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strtolower($key) !== 'host' && strtolower($key) !== 'connection') {
                $headers[] = "$key: $value";
            }
        }
    } else {
        // Fallback: extract headers from $_SERVER
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) === 'HTTP_') {
                $header = str_replace('_', '-', substr($key, 5));
                if (strtolower($header) !== 'host' && strtolower($header) !== 'connection') {
                    $headers[] = "$header: $value";
                }
            }
        }
        // Add Content-Type if present
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers[] = "Content-Type: " . $_SERVER['CONTENT_TYPE'];
        }
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    // Execute request
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    // Log errors for debugging
    if ($curl_error) {
        error_log("API Proxy cURL Error: " . $curl_error);
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Proxy error: ' . $curl_error]);
        exit;
    }

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
