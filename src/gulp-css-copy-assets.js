import fs from 'fs'
import path from 'path'
import md5file from 'md5-file'
import GulpBufferify from 'gulp-bufferify'

function matchAll(str, reg) {
    var res = []
    var match
    while(match = reg.exec(str)) {
        res.push(match)
    }
    return res
}

function isEndAs(str, endStr) {
    var pos = str.length - endStr.length
    return (pos >= 0 && str.lastIndexOf(endStr) == pos)
}

export default function(options = {}) {
    return GulpBufferify((content, file, context) => {
        let exts = ['.css', options.exts]
        let isEx = false

        for(let ext of exts) {
            if(isEndAs(file.path, ext)) {
                isEx = true
                break
            }
        }

        if(!isEx) return content

        content = content.toString()
        let matches = matchAll(content, /url\((\S+?)\)/gi)
        if(matches instanceof Array) {
            matches.forEach(match => {
                let url = match[1].toString()
                // only relative path supported, absolute path will be ignore
                if(url.substr(0, 1) === '/' || url.indexOf('http') === 0) {
                  return
                }
                // clear ' or  '
                let fileurl = url.replace('"', '').replace("'", '')

                // if there is no such file, ignore
                let srcdirs = [path.dirname(file.path)]
                if(options && Array.isArray(options.srcdirs)) {
                    srcdirs = [...srcdirs, ...options.srcdirs]
                }

                let filetruepath

                for(let dir of srcdirs) {
                    let truepath = path.resolve(dir, fileurl)
                    if(fs.existsSync(truepath)) {
                        filetruepath = truepath
                        break
                    }
                }

                if(!filetruepath) return

                // process
                let filehash = md5file.sync(filetruepath).substr(8, 16)
                let filename = filehash + path.extname(filetruepath)
                let filecontent = fs.readFileSync(filetruepath)

                let newfile = file.clone()
                newfile.contents = new Buffer(filecontent)
                newfile.path = path.resolve(path.dirname(file.path), options && options.resolve ? options.resolve : '', filename)

                context.push(newfile)

                let reg = new RegExp(url, 'g')
                content = content.replace(reg, (options && options.resolve ? options.resolve + '/' : '') + filename)
            })
            return content
        }
    })
}