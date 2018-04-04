/* eslint no-unused-vars:[0] */

const gulp = require('gulp');
const bump = require('gulp-bump');
const git = require('gulp-git');
const fs = require('fs');
const child_process = require('child_process');
const readlineSync = require('readline-sync');
const runSequence = require('run-sequence');

const PACKAGE_FILE = './package.json';
const DIST = './dist/';
const version = getPackageJsonVersion();

function getPackageJsonVersion() {
  // require 会缓存多次调用，所以直接文件读取
  return JSON.parse(fs.readFileSync(PACKAGE_FILE, { encoding: 'utf8' })).version;
}

/**
 * private tasks
 */

gulp.task('private-sync-tags', (cb) => {
  // 同步远程 tag
  child_process.execSync('git fetch origin --prune --tags');

  // 查看最新的 tag
  const latestTag
    = child_process.execSync('git describe --tags `git rev-list --tags --max-count=1`');
  console.log('> ------------------------------------');
  console.log(`> The latest tag is: ${latestTag.toString().trim()}`);
  console.log(`> The current tag is: ${version}`);
  console.log('> ------------------------------------');

  cb();
});

gulp.task('private-bump-version', () => {
  // 写入新的 version 到文件
  const newVersion = readlineSync.question('What\'s the new version ? ');

  console.log(`Write ${newVersion} to ${PACKAGE_FILE}`);

  return gulp.src(PACKAGE_FILE)
    .pipe(bump({ version: newVersion }))
    .pipe(gulp.dest('./'));
});

gulp.task('private-commit-changes', () => {
  return gulp.src('.')
    .pipe(git.commit('[VERSION TAG] Bumped version number', { args: '-a' }));
});

gulp.task('private-pull-master', (cb) => {
  git.pull('origin', 'master', cb);
});

gulp.task('private-push-changes', (cb) => {
  git.push('origin', 'master', cb);
});

gulp.task('private-create-new-tag', (cb) => {
  const curVersion = getPackageJsonVersion();
  git.tag(curVersion, `Created Tag for version: ${curVersion}`, (error) => {
    if (error) {
      return cb(error);
    }
    git.push('origin', 'master', { args: '--tags' }, cb);
  });
});
/**
 * 发版
 */
gulp.task('version', (callback) => {
  runSequence(
    'private-pull-master',
    'private-sync-tags',
    'private-bump-version',
    'private-commit-changes',
    'private-push-changes',
    'private-create-new-tag',
    (error) => {
      if (error) {
        console.log(error.message);
      } else {
        console.log('[VERSION TAG] FINISHED SUCCESSFULLY');
      }
      callback(error);
    });
});
