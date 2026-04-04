<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TestingParameterValue extends Model
{
    protected $fillable = [
        'testing_parameter_id',
        'ambient_temp',
        'humidity',
        'soil_moisture',
        'soil_temp',
        'light_intensity',
        'recorded_at',
    ];

    public function testingParameter()
    {
        return $this->belongsTo(TestingParameter::class);
    }
}