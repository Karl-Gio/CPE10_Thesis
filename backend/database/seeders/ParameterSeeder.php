<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Parameter;
use App\Models\ParameterConfiguration;
use App\Models\User;
use Carbon\Carbon;

class ParameterSeeder extends Seeder
{
    private function patternedOffset(array $pattern, int $index): float
    {
        return $pattern[$index % count($pattern)];
    }

    public function run(): void
    {
        $user = User::find(1) ?? User::create([
            'id' => 1,
            'name' => 'Karl Gio',
            'password' => bcrypt('password'),
        ]);

        $batchStartDate = Carbon::create(2026, 1, 1, 8, 0, 0);

        $dataset = [
            [1, 20.30, 40.50, 20.20, 40.20, 30.00, 16, 2.29],
            [2, 20.20, 40.30, 20.10, 40.10, 30.00, 13, 2.14],
            [3, 20.30, 40.40, 20.30, 40.40, 30.00, 16, 3.05],
            [4, 20.40, 40.30, 20.20, 40.20, 30.00, 15, 2.23],
            [5, 20.20, 40.30, 20.10, 39.70, 30.00, 16, 2.17],

            [6, 23.20, 45.30, 23.10, 45.10, 60.00, 15, 2.22],
            [7, 23.30, 45.50, 23.20, 45.30, 60.00, 16, 2.32],
            [8, 23.10, 45.80, 23.10, 44.80, 60.00, 18, 3.15],
            [9, 23.20, 45.30, 23.30, 45.20, 60.00, 19, 2.10],
            [10, 23.30, 45.60, 23.20, 45.40, 60.00, 18, 2.30],

            [11, 25.20, 50.70, 26.20, 50.20, 90.00, 19, 2.43],
            [12, 25.10, 50.30, 26.10, 50.50, 90.00, 23, 2.15],
            [13, 25.30, 50.50, 26.10, 49.80, 90.00, 21, 2.32],
            [14, 25.20, 50.70, 26.30, 50.10, 90.00, 18, 2.22],
            [15, 25.10, 50.60, 26.20, 50.30, 90.00, 22, 2.11],

            [16, 28.10, 55.50, 28.10, 55.40, 120.00, 23, 3.12],
            [17, 28.20, 55.30, 28.20, 55.20, 120.00, 21, 2.14],
            [18, 28.30, 55.90, 28.10, 54.70, 120.00, 24, 2.33],
            [19, 28.20, 55.50, 28.20, 55.10, 120.00, 23, 2.48],
            [20, 28.10, 55.70, 28.10, 55.30, 120.00, 23, 2.15],

            [21, 30.20, 60.60, 30.20, 60.30, 150.00, 24, 2.32],
            [22, 30.10, 60.30, 30.10, 59.80, 150.00, 28, 2.27],
            [23, 30.30, 60.10, 30.10, 60.10, 150.00, 22, 2.10],
            [24, 30.20, 60.60, 30.20, 60.50, 150.00, 20, 2.40],
            [25, 30.10, 60.40, 30.10, 60.20, 150.00, 23, 2.22],

            [26, 25.20, 50.70, 26.20, 50.20, 90.00, 27, 2.32],
            [27, 25.10, 50.30, 26.10, 50.50, 90.00, 23, 3.22],
            [28, 25.30, 50.50, 26.10, 49.80, 90.00, 22, 2.11],
            [29, 25.20, 50.70, 26.30, 50.10, 90.00, 27, 2.33],
            [30, 25.10, 50.60, 26.20, 50.30, 90.00, 24, 2.29],
        ];

        foreach ($dataset as $row) {
            $batchName = 'BATCH-' . str_pad($row[0], 3, '0', STR_PAD_LEFT);
            $actualDays = $row[7];
            $totalHours = $actualDays * 24;

            ParameterConfiguration::create([
                'user_id'      => $user->id,
                'batch'        => $batchName,
                'ambientTemp'  => $row[1],
                'ambientHum'   => $row[2],
                'soilMoisture' => $row[4],
                'soilTemp'     => $row[3],
                'uvStart'      => '07:00',
                'uvDuration'   => (int) round($row[5]),
                'ledStart'     => '18:00',
                'ledDuration'  => (int) round($row[5]),
                'is_active'    => ($row[0] === 30),
                'created_at'   => $batchStartDate,
                'updated_at'   => $batchStartDate,
            ]);

            $tempPattern  = [-0.08, -0.03, 0.00, 0.04, 0.07];
            $humPattern   = [-0.12, -0.05, 0.00, 0.06, 0.11];
            $soilTPattern = [-0.07, -0.02, 0.00, 0.03, 0.06];
            $soilMPattern = [-0.10, -0.04, 0.00, 0.05, 0.09];

            $logIndex = 0;

            for ($hourOffset = 0; $hourOffset < $totalHours; $hourOffset += 12) {
                $logTimestamp = $batchStartDate->copy()->addHours($hourOffset);

                $hourOfDay = $logTimestamp->hour;
                $isPM = ($hourOfDay >= 12 && $hourOfDay < 24);
                $lightValue = $isPM ? 328 : 1;

                Parameter::create([
                    'Ambient_Temperature' => round($row[1] + $this->patternedOffset($tempPattern, $logIndex), 2),
                    'Relative_Humidity'   => round($row[2] + $this->patternedOffset($humPattern, $logIndex), 2),
                    'Soil_Temperature'    => round($row[3] + $this->patternedOffset($soilTPattern, $logIndex), 2),
                    'Soil_Moisture'       => round($row[4] + $this->patternedOffset($soilMPattern, $logIndex), 2),
                    'Light_Intensity'     => $lightValue,
                    'Pechay_Count'        => ($hourOffset < ($totalHours / 2)) ? 0 : $row[6],
                    'Batch'               => $batchName,
                    'created_at'          => $logTimestamp,
                    'updated_at'          => $logTimestamp,
                ]);

                $logIndex++;
            }

            $batchStartDate = $batchStartDate->copy()->addHours($totalHours);
        }
    }
}