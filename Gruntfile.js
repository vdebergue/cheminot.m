module.exports = function(grunt) {
    var sha = grunt.option('sha') || '0.0.1';
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            options: {
                forever: true,
                livereload: true
            },
            scripts: {
                files: ['src/stylus/**/*.styl', 'src/typescripts/**/*.ts', 'src/templates/**/*.html'],
                tasks: ['stylus:app', 'ts:dev', 'copy:dev'],
                options: {
                }
            }
        },
        ts: {
            dev: {
                src: ["src/typescripts/app/**/*.ts"],
                outDir: 'www/assets/javascripts/app',
                options: {
                    target: 'es3',
                    module: 'amd',
                    sourceMap: false
                }
            },
            prod: {
                src: ["src/typescripts/app/**/*.ts"],
                outDir: 'tmp',
                options: {
                    target: 'es3',
                    module: 'amd',
                    sourceMap: false
                }
            }
        },
        requirejs: {
            compile: {
                options: {
                    baseUrl: "tmp",
                    name: "main",
                    out: "www/assets/javascripts/app/main.js",
                    declaration: true
                }
            }
        },
        stylus: {
            app: {
                options: {
                    paths: ['src/stylus'],
                    use: [
                        require('fluidity')
                    ],
                    import: []
                },
                files: {
                    'www/assets/stylesheets/app/main.css': ['src/stylus/main.styl']
                }
            }
        },
        copy: {
            dev: {
                files: [
                    {
                        cwd: 'src/vendors',
                        src: ['**'],
                        dest: 'www/assets/javascripts/vendors',
                        expand: true
                    },
                    {
                        cwd: 'src/templates',
                        src: ['**'],
                        dest: 'www/templates',
                        expand: true
                    },
                    {
                        cwd: 'src/fonts',
                        src: ['**'],
                        dest: 'www/assets/fonts',
                        expand: true
                    },
                    {
                        src: ['src/index.html'],
                        dest: 'www/index.html'
                    },
                    {
                        cwd: 'src/vendors',
                        src: ['**'],
                        dest: 'www/assets/javascripts/vendors',
                        expand: true
                    }
                ]
            },
            prod: {
                files: [
                    {
                        src: ['src/index_dist.html'],
                        dest: 'www/index.html'
                    },
                    {
                        src: ['src/cheminot.appcache'],
                        dest: 'www/cheminot.appcache'
                    },
                    {
                        cwd: 'src/fonts',
                        src: ['**'],
                        dest: 'www/assets/fonts',
                        expand: true
                    },
                    {
                        cwd: 'src/vendors',
                        src: ['**'],
                        dest: 'www/assets/javascripts/vendors',
                        expand: true
                    },
                    {
                        cwd: 'src/templates',
                        src: ['**'],
                        dest: 'www/templates',
                        expand: true
                    },
                ]
            }
        },
        clean: {
            app: [
                "www/assets",
                "www/index.html",
                "www/cheminot.appcache",
                "www/templates"
            ]
        },
        inject: {
            dev: {
                scriptSrc: 'src/config-local.js',
                files: {
                    'www/index.html': 'www/index.html'
                }
            },
            prod: {
                scriptSrc: 'src/config.js',
                files: {
                    'www/index.html': 'www/index.html'
                }
            }
        },
        replace: {
            version: {
                src: ['www/config.xml'],
                overwrite: true,
                replacements: [{
                    from: /version=".*?"/,
                    to: 'version="' + sha + '"'
                }, {
                    from: /versionName=".*?"/,
                    to: 'versionName="' + sha + '"'
                }, {
                    from: /versionCode=".*?"/,
                    to: function(versionCode) {
                        var v = versionCode.match(/versionCode="(.*?)"/)[1] || 0;
                        v = parseInt(v, 10);
                        return 'versionCode="' + (v + 1) + '"';
                    }
                }]
            }
        }
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-stylus');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-inject');
    grunt.loadNpmTasks('grunt-text-replace');

    // Here we  go !
    grunt.registerTask('default', ['clean:app', 'stylus:app', 'ts:dev', 'copy:dev', 'inject:dev', 'replace:version']);
    grunt.registerTask('dev', ['clean:app', 'stylus:app', 'ts:dev', 'copy:dev', 'watch', 'inject:dev', 'replace:version']);
    grunt.registerTask('prod', ['stylus:app', 'ts:prod', 'requirejs', 'copy:prod', 'inject:prod', 'replace:version']);
    grunt.registerTask('cleanAll', ['clean:app']);
};
