<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TestingParameterValue extends Model
{
    protected $fillable = [
        'testing_parameter_id',
        'ambient_temp',
        'ambient_humidity',
        'light_intensity',
        'soil_temp',
        'soil_moisture',
        'recorded_at',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
    ];

    public function testingParameter()
    {
        return $this->belongsTo(TestingParameter::class);
    }
}