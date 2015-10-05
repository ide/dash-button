import gulp from 'gulp';
import babel from 'gulp-babel';
import changed from 'gulp-changed';
import rimraf from 'rimraf';

const paths = {
  source: 'src/**/*.js',
  build: 'build',
};

function build() {
  return gulp.src(paths.source)
    .pipe(changed(paths.build))
    .pipe(babel())
    .pipe(gulp.dest(paths.build));
}

function watch(done) {
  gulp.watch(paths.source, build);
  done();
}

gulp.task(build);
gulp.task('watch', gulp.parallel(build, watch));
gulp.task('clean', done => {
  rimraf(paths.build, done);
});
