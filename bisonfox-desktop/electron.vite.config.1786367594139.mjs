// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
var electron_vite_config_default = defineConfig({
  main: {
    resolve: {
      alias: {
        "@main": resolve("src/main"),
        "@shared": resolve("src/shared")
      }
    },
    build: {
      rollupOptions: {
        external: ["original-fs"]
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        "@preload": resolve("src/preload")
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@shared": resolve("src/shared")
      }
    },
    plugins: [react()]
  }
});
export {
  electron_vite_config_default as default
};
