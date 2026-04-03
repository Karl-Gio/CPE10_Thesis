<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestingParameterValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'testing_parameter_id',
        'ambient_temp',
        'humidity',
        'light_intensity',
        'soil_temp',
        'soil_moisture',
        'recorded_at',
    ];

    protected $casts = [
        'testing_parameter_id' => 'integer',
        'ambient_temp' => 'float',
        'humidity' => 'float',
        'light_intensity' => 'float',
        'soil_temp' => 'float',
        'soil_moisture' => 'float',
        'recorded_at' => 'datetime',
    ];

    public function testingParameter()
    {
        return $this->belongsTo(TestingParameter::class);
    }
}