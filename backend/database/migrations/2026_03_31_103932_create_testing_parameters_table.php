<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testing_parameters', function (Blueprint $table) {
            $table->id();
            $table->string('batch')->nullable();
            $table->decimal('ambient_temp', 8, 2)->nullable();
            $table->decimal('ambient_humidity', 8, 2)->nullable();
            $table->decimal('soil_moisture', 8, 2)->nullable();
            $table->decimal('soil_temp', 8, 2)->nullable();
            $table->boolean('uv')->default(0);
            $table->boolean('led')->default(0);
            $table->integer('duration')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testing_parameters');
    }
};