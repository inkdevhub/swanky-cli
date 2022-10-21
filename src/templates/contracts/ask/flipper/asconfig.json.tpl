{
    "extends": "ask-lang/asconfig.json",
    "targets": {
        "debug": {
            "binaryFile": "build/flipper.wasm",
            "textFile": "build/flipper.wat"
        },
        "release": {
            "binaryFile": "build/flipper.optimized.wasm",
            "textFile": "build/flipper.optimized.wat"
        }
    }
}
