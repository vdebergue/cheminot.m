module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            options: {
                forever: true,
                livereload: true
            },
            scripts: {
                files: ['src/stylus/**/*.styl', 'src/typescripts/**/*.ts', 'src/templates/**/*.html'],
                tasks: ['stylus:dev', 'ts:dev', 'copy:dev'],
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
            }
        },
        stylus: {
            dev: {
                options: {
                    paths: ['src/stylus'],
                    use: [
                        require('fluidity')
                    ],
                    import: []
                },
                files: {
                    'www/assets/stylesheets/app/main.css': ['src/stylus/**/*.styl']
                }
            },
            prod: {
                options: {
                    paths: ['src/stylus'],
                    compress: true,
                    urlfunc: 'embedurl',
                    use: [
                        require('fluidity')
                    ],
                    import: []
                },
                files: {
                    'www/assets/dist/main.css': ['src/stylus/**/*.styl']
                }
            }
        },
        requirejs: {
            compile: {
                options: {
                    baseUrl: "www/assets/javascripts/app",
                    name: "main",
                    out: "www/assets/dist/main.js",
                    declaration: true
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
                        src: ['src/index.html'],
                        dest: 'www/index.html'
                    },
                    {
                        cwd: 'www/assets/javascripts/vendors/',
                        src: ['**'],
                        dest: 'www/assets/dist/vendors/',
                        flatten: true,
                        expand: true
                    }
                ]
            },
            prod: {
                cwd: 'www/assets/javascripts/vendors/',
                src: ['**'],
                dest: 'www/assets/dist/vendors/',
                flatten: true,
                expand: true
            }
        },
        clean: {
            app: ["www/assets/javascripts/app", "www/assets/stylesheets/app"],
            compress: ["www/assets/dist/**/*.js"],
            dist: ["www/assets/dist"]
        }
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-stylus');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');

    // Here we  go !
    grunt.registerTask('default', ['clean:app', 'stylus:dev', 'ts:dev', 'copy:dev']);
    grunt.registerTask('dev', ['clean:app', 'stylus:dev', 'ts:dev', 'watch', 'copy:dev']);
    grunt.registerTask('prod', ['clean:dist', 'ts:dev', 'stylus:prod', 'requirejs', 'copy:prod']);
    grunt.registerTask('cleanAll', ['clean:app', 'clean:dist']);
};
