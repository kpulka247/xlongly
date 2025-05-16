const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const webpack = require('webpack');

// --- Help function for specific target creation ---
const createConfig = (browser, mode) => {
    const isDevelopment = mode === 'development';
    const browserOutputDir = path.resolve(__dirname, 'dist', browser);

    return {
        mode: isDevelopment ? 'development' : 'production',
        devtool: isDevelopment ? 'inline-source-map' : false,
        entry: {
            'content-script': './src/content-script.ts',
            popup: './src/popup/popup.ts',
            background: './src/background.ts',
        },
        output: {
            path: browserOutputDir,
            filename: '[name].js',
            clean: true,
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
            alias: {
                '@': path.resolve(__dirname, 'src/'),
            },
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    exclude: /node_modules/,
                    use: 'ts-loader',
                },
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                    ],
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: (pathData) => {
                            const relativePath = path.relative(path.join(__dirname, 'src'), pathData.filename);
                            return `${relativePath}`;
                        }
                    }
                },
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env.TARGET_BROWSER': JSON.stringify(browser),
                'process.env.NODE_ENV': JSON.stringify(mode)
            }),
            new MiniCssExtractPlugin({
                filename: (pathData) => {
                    if (pathData.chunk.name === 'content-script') {
                        return 'styles/main.css';
                    }
                    return 'styles/[name].css';
                },
                chunkFilename: 'styles/[id].css',
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: `public/manifest.${browser}.json`,
                        to: 'manifest.json',
                    },
                    {
                        from: 'public/icons',
                        to: 'icons',
                        noErrorOnMissing: true
                    },
                    {
                        from: 'src/popup/popup.html',
                        to: 'popup.html',
                    },
                ],
            }),
            !isDevelopment && new ZipPlugin({
                path: path.resolve(__dirname, 'dist'),
                filename: `${browser}-${require('./package.json').version}.zip`,
            })
        ].filter(Boolean),
        optimization: {
            minimize: !isDevelopment,
            minimizer: [
                '...',
                new CssMinimizerPlugin(),
            ],
        },
        node: false,
        target: 'webworker',
    };
};

// --- Main export ---
module.exports = (env, argv) => {
    const mode = argv.mode || 'development';

    const chromeConfig = createConfig('chrome', mode);
    chromeConfig.name = 'chrome';

    const firefoxConfig = createConfig('firefox', mode);
    firefoxConfig.name = 'firefox';

    return [chromeConfig, firefoxConfig];
};