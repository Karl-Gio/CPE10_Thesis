<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Parameter;
use App\Models\ParameterConfiguration;
use App\Models\User;
use Carbon\Carbon;

class ParameterSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::find(1) ?? User::create([
            'id' => 1,
            'name' => 'Karl Gio',
            'password' => bcrypt('password'),
        ]);

        $batchStartDate = Carbon::create(2026, 1, 1, 8, 0, 0);

        $dataset = [
            [1, 20.3, 40.5, 20.2, 40.2, 30.1, 16, 2.29], [2, 20.2, 40.3, 20.1, 40.1, 30.2, 13, 2.14],
            [3, 20.3, 40.4, 20.3, 40.4, 30.1, 16, 3.05], [4, 20.4, 40.3, 20.2, 40.2, 29.8, 15, 2.23],
            [5, 20.2, 40.3, 20.1, 39.7, 30.1, 16, 2.17], [6, 23.2, 45.3, 23.1, 45.1, 60.2, 15, 2.22],
            [7, 23.3, 45.5, 23.2, 45.3, 59.9, 16, 2.32], [8, 23.1, 45.8, 23.1, 44.8, 60.1, 18, 3.15],
            [9, 23.2, 45.3, 23.3, 45.2, 60.3, 19, 2.10], [10, 23.3, 45.6, 23.2, 45.4, 60.1, 18, 2.30],
            [11, 25.2, 50.7, 26.2, 50.2, 90.1, 19, 2.43], [12, 25.1, 50.3, 26.1, 50.5, 90.2, 23, 2.15],
            [13, 25.3, 50.5, 26.1, 49.8, 89.8, 21, 2.32], [14, 25.2, 50.7, 26.3, 50.1, 90.1, 18, 2.22],
            [15, 25.1, 50.6, 26.2, 50.3, 90.3, 22, 2.11], [16, 28.1, 55.5, 28.1, 55.4, 120.2, 23, 3.12],
            [17, 28.2, 55.3, 28.2, 55.2, 119.9, 21, 2.14], [18, 28.3, 55.9, 28.1, 54.7, 120.1, 24, 2.33],
            [19, 28.2, 55.5, 28.2, 55.1, 120.3, 23, 2.48], [20, 28.1, 55.7, 28.1, 55.3, 120.1, 23, 2.15],
            [21, 30.2, 60.6, 30.2, 60.3, 150.2, 24, 2.32], [22, 30.1, 60.3, 30.1, 59.8, 149.8, 28, 2.27],
            [23, 30.3, 60.1, 30.1, 60.1, 150.1, 22, 2.10], [24, 30.2, 60.6, 30.2, 60.5, 150.3, 20, 2.40],
            [25, 30.1, 60.4, 30.1, 60.2, 150.1, 23, 2.22], [26, 25.2, 50.7, 26.2, 50.2, 90.1, 27, 2.32],
            [27, 25.1, 50.3, 26.1, 50.5, 90.2, 23, 3.22], [28, 25.3, 50.5, 26.1, 49.8, 89.8, 22, 2.11],
            [29, 25.2, 50.7, 26.3, 50.1, 90.1, 27, 2.33], [30, 25.1, 50.6, 26.2, 50.3, 90.3, 24, 2.29],
        ];

        foreach ($dataset as $row) {
            $batchName = 'BATCH-' . str_pad($row[0], 3, '0', STR_PAD_LEFT);
            $actualDays = $row[7];
            $totalHours = $actualDays * 24;

            // 1. Save Hardware Config for Batch
            ParameterConfiguration::create([
                'user_id'     => $user->id,
                'batch'       => $batchName,
                'ambientTemp' => $row[1],
                'ambientHum'  => $row[2],
                'soilMoisture'=> $row[4],
                'soilTemp'    => $row[3],
                'uvStart'     => '07:00',
                'uvDuration'  => (int)round($row[5]),
                'ledStart'    => '18:00',
                'ledDuration' => 360,
                'is_active'   => ($row[0] === 30),
                'created_at'  => $batchStartDate,
                'updated_at'  => $batchStartDate,
            ]);

            // 2. Loop through 12-hour intervals for sensor logs
            for ($hourOffset = 0; $hourOffset < $totalHours; $hourOffset += 12) {
                $logTimestamp = $batchStartDate->copy()->addHours($hourOffset);
                
                // --- LIGHT INTENSITY LOGIC ---
                // If the hour is between 6 AM (06:00) and 6 PM (18:00), use AM/PM values
                $hourOfDay = $logTimestamp->hour;
                $isPM = ($hourOfDay >= 12 && $hourOfDay < 24);
                $lightValue = $isPM ? 328 : 1;

                Parameter::create([
                    'Ambient_Temperature' => $row[1] + (rand(-5, 5) / 10),
                    'Relative_Humidity'   => $row[2] + (rand(-5, 5) / 10),
                    'Soil_Temperature'    => $row[3] + (rand(-5, 5) / 10),
                    'Soil_Moisture'       => $row[4] + (rand(-5, 5) / 10),
                    'Light_Intensity'     => $lightValue, // AM (1 lux) or PM (328 lux)
                    'Pechay_Count'        => ($hourOffset < ($totalHours / 2)) ? 0 : $row[6],
                    'Batch'               => $batchName,
                    'created_at'          => $logTimestamp,
                    'updated_at'          => $logTimestamp,
                ]);
            }

            $batchStartDate = $batchStartDate->copy()->addHours($totalHours);
        }
    }
}