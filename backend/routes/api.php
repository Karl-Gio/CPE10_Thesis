<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

// Public Routes (No login needed)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected Routes (Must have valid Token)
Route::middleware('auth:sanctum')->group(function () {
    
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Example: Get logged in user info
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Add your sensor routes here later!
    // Route::get('/sensors', [SensorController::class, 'index']);
});