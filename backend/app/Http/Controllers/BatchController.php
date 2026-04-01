<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    public function index()
    {
        return response()->json(Batch::all());
    }

    public function show($batch_id)
    {
        $batch = Batch::where('batch_id', $batch_id)->firstOrFail();
        return response()->json($batch);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'batch_id'       => 'required|unique:batches,batch_id',
            'date_planted'   => 'required|date',
            'predicted_days' => 'required|numeric',
            'latency_ms'     => 'nullable|integer',
        ]);

        $batch = Batch::create($validated);

        return response()->json([
            'message' => 'Batch saved successfully!',
            'data'    => $batch,
        ], 201);
    }

    public function update(Request $request, $batch_id)
    {
        $batch = Batch::where('batch_id', $batch_id)->firstOrFail();

        $validated = $request->validate([
            'actual_germination_date' => 'required|date',
        ]);

        // Save only once
        if (!$batch->actual_germination_date) {
            $batch->update($validated);
        }

        return response()->json([
            'message' => 'Germination date processed!',
            'data'    => $batch->fresh(),
        ]);
    }

    public function updateLatestGerminationDate(Request $request)
    {
        $validated = $request->validate([
            'germinated' => 'required|boolean',
        ]);

        $batch = Batch::orderByDesc('created_at')->firstOrFail();

        if ($validated['germinated'] && !$batch->actual_germination_date) {
            $batch->update([
                'actual_germination_date' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Latest batch germination date processed!',
            'data' => $batch->fresh(),
        ]);
    }
}