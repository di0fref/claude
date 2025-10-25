<?php
// Simple API proxy for environments without mod_proxy
// Forwards requests from /api/* to http://localhost:5000/api/*

// Log that we're being executed
$log_file = __DIR__ . '/logs/api-proxy.log';
@file_put_contents($log_file, date('Y-m-d H:i:s') . " - API proxy script executed - Method: " . $_SERVER['REQUEST_METHOD'] . " URI: " . $_SERVER['REQUEST_URI'] . "\n", FILE_APPEND);

// Handle CORS preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Connect to internal SSH server IP (web server and SSH are different machines)
$api_base = 'http://10.0.1.141:30001';
$use_socket = false;
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

    // Forward headers (excluding host)
    $headers = [];

    // Check for Authorization header in Apache-specific location
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers[] = "Authorization: " . $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers[] = "Authorization: " . $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    // getallheaders() may not be available, use $_SERVER as fallback
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strtolower($key) !== 'host' && strtolower($key) !== 'connection' && strtolower($key) !== 'authorization') {
                $headers[] = "$key: $value";
            }
        }
    } else {
        // Fallback: extract headers from $_SERVER
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) === 'HTTP_') {
                // Convert HTTP_AUTHORIZATION to Authorization, HTTP_CONTENT_TYPE to Content-Type, etc.
                $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))));
                if (strtolower($header) !== 'host' && strtolower($header) !== 'connection') {
                    $headers[] = "$header: $value";
                }
            }
        }
        // Add Content-Type if present
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers[] = "Content-Type: " . $_SERVER['CONTENT_TYPE'];
        }
        // Add Authorization if present (sometimes not in HTTP_ prefix)
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers[] = "Authorization: " . $_SERVER['HTTP_AUTHORIZATION'];
        }
    }

    // Handle file uploads differently from regular POST data
    if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {
        // Check if this is a multipart/form-data request (file upload)
        $content_type = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
        if (strpos($content_type, 'multipart/form-data') !== false && !empty($_FILES)) {
            // Build multipart form data for file upload
            $postfields = [];

            // Add regular POST fields
            foreach ($_POST as $key => $value) {
                $postfields[$key] = $value;
            }

            // Add files
            foreach ($_FILES as $key => $file) {
                if ($file['error'] === UPLOAD_ERR_OK) {
                    $postfields[$key] = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
                    // Log file upload
                    @file_put_contents($log_file, date('Y-m-d H:i:s') . " - File upload: key=$key, name={$file['name']}, size={$file['size']}, type={$file['type']}\n", FILE_APPEND);
                } else {
                    @file_put_contents($log_file, date('Y-m-d H:i:s') . " - File upload error: key=$key, error={$file['error']}\n", FILE_APPEND);
                }
            }

            curl_setopt($ch, CURLOPT_POSTFIELDS, $postfields);
            // Remove Content-Type and Content-Length from headers - cURL will set them correctly
            $headers = array_filter($headers, function($header) {
                return stripos($header, 'Content-Type:') !== 0 && stripos($header, 'Content-Length:') !== 0;
            });
        } else {
            // Regular JSON/form data
            $body = file_get_contents('php://input');
            if ($body) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            }
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

    // Debug logging - write to file since error_log might not be accessible
    $log_file = __DIR__ . '/logs/api-proxy.log';
    $log_msg = date('Y-m-d H:i:s') . " - Status=$status, Content-Type=$content_type, Response length=" . strlen($response) . ", Response: " . substr($response, 0, 200) . "\n";
    @file_put_contents($log_file, $log_msg, FILE_APPEND);

    error_log("API Proxy: Status=$status, Content-Type=$content_type, Response length=" . strlen($response));

    // Set response status and headers - Content-Length MUST come before status code
    header('Content-Length: ' . strlen($response));
    http_response_code($status);
    if ($content_type) {
        header('Content-Type: ' . $content_type);
    }

    // Disable caching for API responses
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');

    // Output response
    echo $response;
    exit;
} else {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Not found']);
}
?>
