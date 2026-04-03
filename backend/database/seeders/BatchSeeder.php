<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Batch;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;

class BatchSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::find(1) ?? User::create([
            'id' => 1,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
        ]);

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
            $predictedDays = $row[1];
            $actualDays = $row[2];

            $predictedValue = ($id <= 10) ? null : $predictedDays;
            $actualGerminationDate = $currentPlantingDate->copy()->addHours($actualDays * 24);

            Batch::create([
                'user_id' => $user->id,
                'batch_id' => 'BATCH-' . str_pad($id, 3, '0', STR_PAD_LEFT),
                'date_planted' => $currentPlantingDate,
                'predicted_days' => $predictedValue,
                'actual_germination_date' => $actualGerminationDate,
                'latency_ms' => rand(120, 480),
                'created_at' => $currentPlantingDate,
                'updated_at' => $currentPlantingDate,
            ]);

            $currentPlantingDate = $actualGerminationDate;
        }
    }
}