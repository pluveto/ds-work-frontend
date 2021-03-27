export function download(filename, content) {
    // 创建a标签
    var tmpElm = document.createElement('a');

    //文件的名称为时间戳加文件名后缀
    tmpElm.download = filename;
    tmpElm.style.display = 'none';

    //生成一个blob二进制数据，内容为json数据
    var blob = new Blob([content]);

    //生成一个指向blob的URL地址，并赋值给a标签的href属性
    tmpElm.href = URL.createObjectURL(blob);
    document.body.appendChild(tmpElm);
    tmpElm.click();
    document.body.removeChild(tmpElm);
}

/**
 * 
 * @param {multiple: bool, accecpt: string} options 
 * @returns 
 */
export function load(options = {}) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
  
      if (options.multiple)
        input.setAttribute('multiple', '')
  
      if (options.accept)
        input.setAttribute('accept', options.accept)
  
      input.setAttribute('type', 'file')
      input.style.display = 'none'
  
      input.addEventListener('change', ev => {
        if (input.files.length) {
          if (options.multiple)
            resolve(input.files)
          else
            resolve(input.files[0])
        } else {
          reject(ev)
        }
        input.remove()
      })
  
      document.body.appendChild(input)
  
      const event = document.createEvent('MouseEvent')
      event.initMouseEvent('click', false, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
      input.dispatchEvent(event)
    })
  }