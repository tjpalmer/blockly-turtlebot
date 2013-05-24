module.exports = function(grunt) {
  grunt.initConfig({

    // TODO Source maps for typescript and uglify???
    typescript: {
      blockly_turtlebot: {
        options: {base_path: "src"},
        src: ["src/main.ts"],
        dest: "build/blockly-turtlebot.js",
      },
    },

    uglify: {
      blockly_turtlebot: {
        src: ["<%= typescript.blockly_turtlebot.dest %>"],
        dest: "blockly-turtlebot.min.js",
      },
    },

    watch: {
      typescript: {
        files: ["src/*"],
        tasks: ['default'],
      }
    },

  });

  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-typescript");

  grunt.registerTask('default', ['typescript', 'uglify']);

};
