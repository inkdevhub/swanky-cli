{
    "extends": "ask-lang/asconfig.json",
    "targets": {
        "debug": {
            "binaryFile": "build/flipper.debug.wasm",
            "textFile": "build/flipper.debug.wat"
        },
        "release": {
            "binaryFile": "build/flipper.wasm",
            "textFile": "build/flipper.wat"
        }
    }
}
