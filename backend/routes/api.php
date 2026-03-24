<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ParameterController;

// ==========================================
// PUBLIC ROUTES (No login needed)
// ==========================================
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Arduino / Python Data Logging (Public so the Pi can easily POST/GET data)
Route::get('/parameters', [ParameterController::class, 'index']);
Route::post('/parameters', [ParameterController::class, 'store']);

// ==========================================
// PROTECTED ROUTES (Must have valid Token from React)
// ==========================================
Route::middleware('auth:sanctum')->group(function () {
    
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Get logged in user info
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    // GET: Fetch the active settings to fill the React Inputs
    Route::get('/configurations/active', [ParameterController::class, 'showActiveConfig']);
    
    // POST: Save the new settings from React
    Route::post('/configurations', [ParameterController::class, 'storeConfig']);
    
});