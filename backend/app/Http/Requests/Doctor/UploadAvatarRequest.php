<?php

namespace App\Http\Requests\Doctor;

class UploadAvatarRequest extends DoctorRequest
{
    public function rules(): array
    {
        return ['avatar' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:2048', 'dimensions:max_width=4000,max_height=4000']];
    }
}
