/* eslint-disable */
const path = require("path");
const nodeExternals = require("webpack-node-externals");

const PROD = ["production", "prod"].includes(process.env?.NODE_ENV?.toLowerCase() ?? "");

module.exports = {
  target: "node",
  mode: PROD ? "production" : "development",
  entry: {
    main: "./src/index.ts",
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: "out.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      { 
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  },
};