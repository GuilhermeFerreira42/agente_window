{
  "targets": [
    {
      "target_name": "agente_window_fs_boundary",
      "conditions": [
        ["OS=='linux'", {
          "sources": ["src/linux.cc"],
          "cflags_cc": ["-std=c++17", "-Wall", "-Wextra", "-Werror"]
        }],
        ["OS!='linux'", {
          "sources": ["src/unsupported.cc"]
        }]
      ]
    }
  ]
}
