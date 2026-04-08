<?php
require_once __DIR__ . '/../config.php';
require_auth();
json_out(['key' => GOOGLE_API_KEY]);
