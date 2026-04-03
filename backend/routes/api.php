<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ParameterController;
use App\Http\Controllers\BatchController;
use App\Http\Controllers\TestingParameterController;
use App\Http\Controllers\TestingParameterValueController;

// Public
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/parameters', [ParameterController::class, 'index']);
    Route::post('/parameters', [ParameterController::class, 'store']);

    Route::get('/dashboard/latest', [ParameterController::class, 'latest']);
    Route::get('/dashboard/trends', [ParameterController::class, 'trends']);

    Route::get('/configurations/active', [ParameterController::class, 'showActiveConfig']);
    Route::post('/configurations', [ParameterController::class, 'storeConfig']);
    Route::get('/configurations/batch/{batch}', [ParameterController::class, 'showBatchConfig']);

    Route::get('/batches', [BatchController::class, 'index']);
    Route::get('/batches/{batch_id}', [BatchController::class, 'show']);
    Route::post('/batches', [BatchController::class, 'store']);
    Route::patch('/batches/latest/germination-date', [BatchController::class, 'updateLatestGerminationDate']);
    Route::patch('/batches/{batch_id}', [BatchController::class, 'update']);
    Route::get('/monitoring/{batch_id}', [BatchController::class, 'monitoring']);

    Route::get('/testing-parameters/latest', [TestingParameterController::class, 'latest']);
    Route::apiResource('testing-parameters', TestingParameterController::class);

    Route::prefix('testing-values')->group(function () {
        Route::post('/', [TestingParameterValueController::class, 'store']);
        Route::get('/', [TestingParameterValueController::class, 'index']);
        Route::get('/latest', [TestingParameterValueController::class, 'latest']);
    });
});