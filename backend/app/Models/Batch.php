<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    protected $fillable = [
        'batch_id', 
        'date_planted', 
        'predicted_days', 
        'actual_germination_date'
    ];

    public function parameters()
    {
        return $this->hasMany(Parameter::class, 'batch_id', 'batch_id');
    }
}
