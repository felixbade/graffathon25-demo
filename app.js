const canvas = document.querySelector('canvas');
const instructions = document.getElementById('instructions');

// not sure how to resize the bauble player so just forcing 1080p
canvas.width = 1920;
canvas.height = 1080;

/*
(morph (osc t 4 | ss 0.1 0.9)
    (octahedron (sqrt 2 * 100) | rotate y pi/4)
    (box 100))
*/

const bauble = new Bauble(canvas, {
    source: "#version 300 es\nprecision highp float;\n\nstruct Ray {\n  vec3 origin;\n  vec3 direction;\n};\n\nout vec4 frag_color;\n\nuniform float free_camera_zoom;\nuniform vec3 free_camera_target;\nuniform vec2 free_camera_orbit;\nuniform float t;\nuniform vec4 viewport;\n\nmat2 rotation_2d(float angle) {\n  float s = sin(angle);\n  float c = cos(angle);\n  return mat2(c, s, -s, c);\n}\n\nfloat max_(vec2 v) {\n  return max(v.x, v.y);\n}\n\nmat3 rotation_y(float angle) {\n  float s = sin(angle);\n  float c = cos(angle);\n  return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);\n}\n\nmat3 rotation_x(float angle) {\n  float s = sin(angle);\n  float c = cos(angle);\n  return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);\n}\n\nvec3 perspective_vector(float fov, vec2 frag_coord) {\n  float cot_half_fov = tan(radians(90.0 - (fov * 0.5)));\n  return normalize(vec3(frag_coord, cot_half_fov));\n}\n\nfloat sdf_octahedron(float radius, vec3 p) {\n  vec3 p1 = abs(p);\n  float m = ((p1.x + p1.y) + p1.z) - radius;\n  vec3 q = vec3(0.0, 0.0, 0.0);\n  if ((3.0 * p1.x) < m) q = p1.xyz;\n  else if ((3.0 * p1.y) < m) q = p1.yzx;\n  else if ((3.0 * p1.z) < m) q = p1.zxy;\n  else return m * (sqrt(3.0) / 3.0);\n  float k = clamp(((q.z - q.y) + radius) * 0.5, 0.0, radius);\n  return length(vec3(q.x, (q.y - radius) + k, q.z - k));\n}\n\nfloat rotate_outer(vec3 p) {\n  {\n    vec3 p1 = p * rotation_y(0.785398163397448);\n    return sdf_octahedron(141.42135623731, p1);\n  }\n}\n\nfloat max_1(vec3 v) {\n  return max(v.x, max(v.y, v.z));\n}\n\nfloat sdf_cube(float size, vec3 p) {\n  vec3 d = abs(p) - size;\n  return length(max(d, 0.0)) + min(max_1(d), 0.0);\n}\n\nfloat nearest_distance(vec3 p, float t) {\n  return mix(rotate_outer(p), sdf_cube(100.0, p), smoothstep(0.1, 0.9, (1.0 * (1.0 - ((cos((6.28318530717959 * t) / 4.0) + 1.0) * 0.5))) + 0.0));\n}\n\nfloat march(out uint steps, Ray ray, float t) {\n  float ray_depth = 0.0;\n  for (steps = 0u; steps < 256u; ++steps) {\n    {\n      float depth = ray_depth;\n      vec3 P = ray.origin + (ray_depth * ray.direction);\n      vec3 p = P;\n      float dist = nearest_distance(p, t);\n      if (((dist >= 0.0) && (dist < 0.1)) || (ray_depth > 65536.0)) return ray_depth;\n      float rate = (dist > 0.0) ? 0.95 : 1.05;\n      ray_depth += dist * rate;\n      if (ray_depth < 0.0) return 0.0;\n    }\n  }\n  return ray_depth;\n}\n\nfloat with_outer(vec3 p, float t) {\n  {\n    vec3 p1 = (vec2(1.0, -1.0).xyy * 0.005) + p;\n    return nearest_distance(p1, t);\n  }\n}\n\nfloat with_outer1(vec3 p, float t) {\n  {\n    vec3 p1 = (vec2(1.0, -1.0).yyx * 0.005) + p;\n    return nearest_distance(p1, t);\n  }\n}\n\nfloat with_outer2(vec3 p, float t) {\n  {\n    vec3 p1 = (vec2(1.0, -1.0).yxy * 0.005) + p;\n    return nearest_distance(p1, t);\n  }\n}\n\nfloat with_outer3(vec3 p, float t) {\n  {\n    vec3 p1 = (vec2(1.0, -1.0).xxx * 0.005) + p;\n    return nearest_distance(p1, t);\n  }\n}\n\nvec3 do_(vec2 Frag_Coord, vec2 resolution) {\n  const vec3 light = pow(vec3(69.0, 72.0, 79.0) / 255.0, vec3(2.2));\n  const vec3 dark = pow(vec3(40.0, 42.0, 46.0) / 255.0, vec3(2.2));\n  return vec3(mix(dark, light, (Frag_Coord.x + Frag_Coord.y) / (resolution.x + resolution.y)));\n}\n\nfloat fresnel(float exponent, vec3 normal, Ray ray) {\n  return pow(1.0 + dot(normal, ray.direction), exponent);\n}\n\nvec4 sample_(vec2 Frag_Coord, vec2 frag_coord, vec2 free_camera_orbit, float free_camera_zoom, vec3 free_camera_target, vec2 resolution, float t) {\n  Ray ray_star = Ray(vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0));\n  vec3 ortho_quad = vec3(0.0, 0.0, 0.0);\n  float ortho_scale = 0.0;\n  float fov = 0.0;\n  mat3 camera_rotation_matrix = rotation_y(6.28318530717959 * free_camera_orbit.x) * rotation_x(6.28318530717959 * free_camera_orbit.y);\n  ray_star = Ray((camera_rotation_matrix * vec3(0.0, 0.0, 512.0 * free_camera_zoom)) + free_camera_target, camera_rotation_matrix * (perspective_vector(45.0, frag_coord) * vec3(1.0, 1.0, -1.0)));\n  uint steps = 0u;\n  {\n    Ray ray = ray_star;\n    float depth = march(steps, ray, t);\n    vec3 P = ray.origin + (ray.direction * depth);\n    vec3 p = P;\n    float dist = nearest_distance(p, t);\n    vec3 normal = normalize((vec2(1.0, -1.0).xyy * with_outer(p, t)) + (vec2(1.0, -1.0).yyx * with_outer1(p, t)) + (vec2(1.0, -1.0).yxy * with_outer2(p, t)) + (vec2(1.0, -1.0).xxx * with_outer3(p, t)));\n    vec4 color = vec4(0.0);\n    color = (dist >= 10.0) ? vec4(do_(Frag_Coord, resolution), 1.0) : vec4(mix((normal + 1.0) * 0.5, vec3(1.0, 1.0, 1.0), fresnel(5.0, normal, ray)), 1.0);\n    return color;\n  }\n}\n\nvec3 pow_(vec3 v, float e) {\n  return pow(v, vec3(e));\n}\n\nvoid main() {\n  const float gamma = 2.2;\n  vec3 color = vec3(0.0, 0.0, 0.0);\n  float alpha = 0.0;\n  const uint aa_grid_size = 1u;\n  const float aa_sample_width = 1.0 / float(1u + aa_grid_size);\n  const vec2 pixel_origin = vec2(0.5, 0.5);\n  vec2 local_frag_coord = gl_FragCoord.xy - viewport.xy;\n  mat2 rotation = rotation_2d(0.2);\n  for (uint y = 1u; y <= aa_grid_size; ++y) {\n    for (uint x = 1u; x <= aa_grid_size; ++x) {\n      vec2 sample_offset = (aa_sample_width * vec2(float(x), float(y))) - pixel_origin;\n      sample_offset = rotation * sample_offset;\n      sample_offset = fract(sample_offset + pixel_origin) - pixel_origin;\n      {\n        vec2 Frag_Coord = local_frag_coord + sample_offset;\n        vec2 resolution = viewport.zw;\n        vec2 frag_coord = ((Frag_Coord - (0.5 * resolution)) / max_(resolution)) * 2.0;\n        vec4 this_sample = clamp(sample_(Frag_Coord, frag_coord, free_camera_orbit, free_camera_zoom, free_camera_target, resolution, t), 0.0, 1.0);\n        color += this_sample.rgb * this_sample.a;\n        alpha += this_sample.a;\n      }\n    }\n  }\n  if (alpha > 0.0) {\n    color = color / alpha;\n    alpha /= float(aa_grid_size * aa_grid_size);\n  }\n  frag_color = vec4(pow_(color, 1.0 / gamma), alpha);\n}\n",
    animation: false, // wait for keypress to start
    interaction: false,
});


document.addEventListener('keydown', (e) => {
    if (e.key === 'f') {
        if (!document.fullscreenElement) {
            document.body.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    if (e.key === ' ') {
        bauble.togglePlay();
        instructions.style.display = 'none';
        canvas.style.display = 'block';
    }
});