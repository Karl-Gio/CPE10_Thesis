<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Batch;
use Carbon\Carbon;

class BatchSeeder extends Seeder
{
    public function run(): void
    {
        // Start the very first batch on Jan 1st, 2026
        $currentPlantingDate = Carbon::create(2026, 1, 1, 8, 0, 0);

        $dataRows = [
            [1, 2.20, 2.29], [2, 2.15, 2.14], [3, 3.10, 3.05], [4, 2.30, 2.23], [5, 2.10, 2.17],
            [6, 2.25, 2.22], [7, 2.50, 2.32], [8, 3.20, 3.15], [9, 2.20, 2.10], [10, 2.25, 2.30],
            [11, 2.40, 2.43], [12, 2.20, 2.15], [13, 2.30, 2.32], [14, 2.25, 2.22], [15, 2.10, 2.11],
            [16, 3.05, 3.12], [17, 2.20, 2.14], [18, 2.30, 2.33], [19, 2.40, 2.48], [20, 2.20, 2.15],
            [21, 2.35, 2.32], [22, 2.25, 2.27], [23, 2.15, 2.10], [24, 2.50, 2.40], [25, 2.20, 2.22],
            [26, 2.30, 2.32], [27, 3.15, 3.22], [28, 2.20, 2.11], [29, 2.30, 2.33], [30, 2.25, 2.29],
        ];

        foreach ($dataRows as $row) {
            $id = $row[0];
            $pDays = $row[1];
            $aDays = $row[2];

            // 1. Calculate the actual date this batch finishes
            $actualGerminationDate = $currentPlantingDate->copy()->addHours($aDays * 24);

            Batch::create([
                'batch_id'                => 'BATCH-' . str_pad($id, 3, '0', STR_PAD_LEFT),
                'date_planted'            => $currentPlantingDate,
                'predicted_days'          => $pDays,
                'actual_germination_date' => $actualGerminationDate,
                'latency_ms'              => rand(120, 480),
                // Manually setting timestamps to match date_planted
                'created_at'              => $currentPlantingDate,
                'updated_at'              => $currentPlantingDate,
            ]);

            // 2. Sequential Logic: The next batch starts when this one finishes
            $currentPlantingDate = $actualGerminationDate;
        }
    }
}