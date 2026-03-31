<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ParameterController;
use App\Http\Controllers\BatchController;
use App\Http\Controllers\TestingParameterController;
use App\Http\Controllers\TestingParameterValueController;

// ==========================================
// PUBLIC ROUTES (No login needed)
// ==========================================
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Arduino / Python Data Logging
Route::get('/parameters', [ParameterController::class, 'index']);
Route::post('/parameters', [ParameterController::class, 'store']);

// Dashboard sensor endpoints
Route::get('/dashboard/latest', [ParameterController::class, 'latest']);
Route::get('/dashboard/trends', [ParameterController::class, 'trends']);

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
    Route::get('/configurations/batch/{batch}', [ParameterController::class, 'showBatchConfig']);
});

Route::get('/batches', [BatchController::class, 'index']);
Route::get('/batches/{batch_id}', [BatchController::class, 'show']);
Route::post('/batches', [BatchController::class, 'store']);
Route::patch('/batches/{batch_id}', [BatchController::class, 'update']);

Route::apiResource('testing-parameters', TestingParameterController::class);

Route::prefix('testing-values')->group(function () {
    Route::post('/', [TestingParameterValueController::class, 'store']);
    Route::get('/', [TestingParameterValueController::class, 'index']);
    Route::get('/latest', [TestingParameterValueController::class, 'latest']);
});