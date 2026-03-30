<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    protected $fillable = [
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

    public function parameters()
    {
        return $this->hasMany(Parameter::class, 'batch_id', 'batch_id');
    }
}