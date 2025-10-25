<?php
// Proxy for uploaded files
$backend_url = 'http://10.0.1.141:30001';
$request_uri = $_SERVER['REQUEST_URI'];

// Build the full backend URL
$target_url = $backend_url . $request_uri;

// Initialize cURL
$ch = curl_init($target_url);

// Set cURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Execute request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

// Get headers and body
$headers = substr($response, 0, $header_size);
$body = substr($response, $header_size);

curl_close($ch);

// Parse and forward headers
$header_lines = explode("\r\n", $headers);
foreach ($header_lines as $header) {
    if (stripos($header, 'Content-Type:') === 0 ||
        stripos($header, 'Content-Length:') === 0 ||
        stripos($header, 'Content-Disposition:') === 0) {
        header($header);
    }
}

// Set HTTP response code
http_response_code($http_code);

// Output the body
echo $body;
?>
