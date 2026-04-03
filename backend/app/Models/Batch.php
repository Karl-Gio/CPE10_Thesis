<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'batch_id',
        'date_planted',
        'predicted_days',
        'actual_germination_date',
        'latency_ms',
    ];

    protected $casts = [
        'date_planted' => 'datetime',
        'actual_germination_date' => 'datetime',
        'latency_ms' => 'integer',
        'predicted_days' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function parameters()
    {
        return $this->hasMany(Parameter::class);
    }

    public function testingParameters()
    {
        return $this->hasMany(TestingParameter::class);
    }

    public function parameterConfigurations()
    {
        return $this->hasMany(ParameterConfiguration::class);
    }
}