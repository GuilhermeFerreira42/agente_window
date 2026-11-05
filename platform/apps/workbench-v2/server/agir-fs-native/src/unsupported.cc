#include <node_api.h>

static napi_value unavailable(napi_env env, napi_callback_info) {
  napi_throw_error(env, "ENOTSUP",
                   "F2 secure filesystem is unavailable on this platform; no path-based fallback is permitted.");
  return nullptr;
}

static napi_value init(napi_env env, napi_value exports) {
  napi_value supported;
  napi_get_boolean(env, false, &supported);
  napi_set_named_property(env, exports, "supported", supported);
  napi_property_descriptor method = {
    "SandboxRoot", nullptr, unavailable, nullptr, nullptr, nullptr, napi_default, nullptr
  };
  napi_define_properties(env, exports, 1, &method);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
