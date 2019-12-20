const { src, dest, watch } = require(`gulp`);
const { series } = require('gulp');
const babel = require(`gulp-babel`);
const sass = require(`gulp-sass`);
const sassLint = require(`gulp-sass-lint`);
const jsLinter = require(`gulp-eslint`);
const htmlValidator = require(`gulp-html`);
const htmlMinifier = require(`gulp-htmlmin`);
const imageCompressor = require(`gulp-imagemin`);
const cssCompressor = require('gulp-csso');
const del = require(`del`);
const browserSync = require(`browser-sync`);
const reload = browserSync.reload;
const TEMP_FOLDER = 'temp';
const VIEWS_FOLDER = 'views/html';
const HTMLPreprocessor = require(`gulp-nunjucks-render`);
const data = require(`gulp-data`);
const fs = require(`fs`);
const nunjucks = require(`nunjucks`);
// Note: All the linter-related config files mentioned in the comments below are
// empty. Part of this assignment is to populate them with your own config files from
// the previous assignment.

/**
 * Fetch all JS files and transpile into ES6, depending on the configurations
 * included in .babelrc, which is in the root of this project.
 *
 * @returns {*}
 */
let transpileJSForDev = () => {
    return src(`views/scripts/*.js`)
        .pipe(babel())
        .pipe(dest(`temp/scripts`));
};

/**
 * Before transpiling Sass → CSS, lint the former using the config options defined
 * in the file .sass-lint.yml, which is in the root of this project.
 *
 * @returns {*}
 */
let compileCSSForDev = () => {
    return src(`views/styles/main.scss`)
        .pipe(sassLint({configFile: './.sass-lint.yml'}))
        .pipe(sassLint.format())
        .pipe(sassLint.failOnError())
        .pipe(sass())
        .pipe(dest(`temp/styles`));
};

/**
 * Transpile ES5 → ES6, based on the configurations in ./eslintrc.json, which is in
 * the root of this project.
 *
 * @returns {*}
 */
let lintJS = () => {
    return src(`views/scripts/*.js`)
        .pipe(jsLinter(`./.eslintrc.json`))
        .pipe(jsLinter.formatEach(`compact`, process.stderr));
};

let validateHTML = () => {
    return src(`views/html/*.html`)
        .pipe(htmlValidator());
};

let compressHTML = () => {
    return src(`views/html/*.html`)
        .pipe(htmlMinifier({collapseWhitespace: true}))
        .pipe(dest(`prod`));
};

let compileCSSForProd = () => {
    return src(`views/styles/main.scss`)
        .pipe(sass({outputStyle: 'compressed', precision: 10,
        }).on('error', sass.logError))
        .pipe(cssCompressor())
        .pipe(dest(`prod/styles`));
};

let compressThenCopyImagesToProdFolder = () =>  {
    return src(`views/img/**/*`)
        .pipe(imageCompressor({
            optimizationLevel: 3, // For PNG files. Accepts 0 – 7; 3 is default.
            progressive: true,    // For JPG files.
            multipass: false,     // For SVG files. Set to true for compression.
            interlaced: false     // For GIF files. Set to true for compression.
        }))
        .pipe(dest(`prod/img`));
};

let compileHTML = () => {
    HTMLPreprocessor.nunjucks.configure({watch: false});

    return src(`./views/*.html`)
        .pipe(data(function () {
            return JSON.parse(fs.readFileSync(`./app/models/links-file.json`));
        }))
        .pipe(HTMLPreprocessor())
        .pipe(dest(TEMP_FOLDER));
};

let serve = () => {
    browserSync({
        server: {
            baseDir: [
                TEMP_FOLDER,
                VIEWS_FOLDER
            ]
        }
    });

    watch([
            `./views/*.html`,
            `./views/css/*.css`,
            `./controllers/*.*`,
            `./controllers/**/**`,
            `./models/*.json`
        ],
        compileHTML).on(`change`, reload);
};


/**
 * Use pure Node to delete the “temp” folder. Add folder paths to the
 * “foldersToDelete” array below in order to delete more folders when running the
 * “clean” task.
 *
 * @returns {Promise<void>}
 */
async function clean () {
    let fs = require(`fs`),
        i,
        foldersToDelete = [`temp`];

    for (i = 0; i < foldersToDelete.length; i++) {
        try {
            fs.accessSync(foldersToDelete[i], fs.F_OK);
            process.stdout.write(`\n\tThe ` + foldersToDelete[i] +
                ` directory was found and will be deleted.\n`);
            del(foldersToDelete[i]);
        } catch (e) {
            process.stdout.write(`\n\tThe ` + foldersToDelete[i] +
                ` directory does NOT exist or is NOT accessible.\n`);
        }
    }

    process.stdout.write(`\n`);
}

exports.lintJS = lintJS;
exports.transpileJSForDev = transpileJSForDev;
exports.compileCSSForDev = compileCSSForDev;
exports.compileCSSForProd = compileCSSForProd;
exports.validateHTML = validateHTML;
exports.compressHTML = compressHTML;
exports.build = series(validateHTML, compressHTML, compileCSSForProd, compressThenCopyImagesToProdFolder);
exports.serve = series(compileHTML, serve);
exports.compileHTML = compileHTML;
exports.compressThenCopyImagesToProdFolder = compressThenCopyImagesToProdFolder;
exports.clean = clean;
