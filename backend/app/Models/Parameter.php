<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Parameter extends Model
{
    use HasFactory;

    protected $table = 'parameters';

    protected $fillable = [
        'Batch',
        'Ambient_Temperature',
        'Relative_Humidity',
        'Soil_Temperature',
        'Soil_Moisture',
        'Light_Intensity',
        'Pechay_Count',
    ];

    protected $casts = [
        'Ambient_Temperature' => 'float',
        'Relative_Humidity'   => 'float',
        'Soil_Temperature'    => 'float',
        'Soil_Moisture'       => 'float',
        'Light_Intensity'     => 'float',
        'Pechay_Count'        => 'integer',
    ];
}