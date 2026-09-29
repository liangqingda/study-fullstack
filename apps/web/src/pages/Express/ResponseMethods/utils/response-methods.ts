export type Method = {
  name: string;
  slug: string;
  description: string;
  note: string;
  explanation: string;
  steps: string[];
  code: string;
  observation: string;
  interpretation: string;
  comparison: string;
};

export const basePath = '/api/response-methods';

export const methods: Method[] = [
  {
    name: 'res.download()', slug: 'download', description: '提示客户端下载文件',
    note: '把服务器上的文件作为附件发送。',
    explanation: '适合导出报表或提供附件。它基于文件发送，但会设置下载相关的响应头，浏览器通常会保存文件。',
    steps: [
      'GET /download 找到服务器上的示例文本文件，并指定下载时使用的文件名。',
      'Express 读取文件并设置 Content-Disposition: attachment; filename=...，提示浏览器把内容当作附件。',
      '页面的 fetch 仍会读取文件内容；点击“下载”才会让浏览器按附件方式保存。',
    ],
    code: "res.download(sampleFile, 'express-download-demo.txt');",
    observation: '状态 200、Content-Disposition 含 attachment 和文件名；“下载”会触发浏览器保存。',
    interpretation: '附件标记来自 res.download()，不是文件扩展名决定的。fetch 只读取响应，不会自己弹出下载框，所以要用独立的下载链接体验浏览器动作。',
    comparison: 'res.sendFile() 也发送同一文件，但不主动设置 attachment；它更适合让浏览器直接显示内容。',
  },
  {
    name: 'res.end()', slug: 'end', description: '结束响应流程',
    note: '结束连接，不再写入响应体。',
    explanation: '适合只需确认请求已处理、不需要返回内容的场景。这里先设为 204，再用 end() 结束响应。',
    steps: [
      '路由先设定 HTTP 204 No Content，表示请求已处理且没有响应体。',
      'res.end() 立即结束响应，不序列化数据，也不自动写入状态文字。',
      '浏览器收到状态码和响应头；读取 body 时得到空字符串。',
    ],
    code: 'res.status(204).end();',
    observation: '状态 204，Body 为空，Content-Type 通常不存在。',
    interpretation: '空响应体既来自 end() 不写内容，也符合 204 不允许响应体的语义；不是请求失败。',
    comparison: 'res.sendStatus(418) 会把状态文字写进 Body；res.status(204).end() 只结束响应。若改用 204，即便尝试发送内容也不应依赖它被传输。',
  },
  {
    name: 'res.json()', slug: 'json', description: '发送 JSON 响应',
    note: '把 JavaScript 值序列化为 JSON。',
    explanation: '最常见的 API 返回方式。Express 会把对象序列化，并设置 JSON 类型的 Content-Type。',
    steps: [
      '路由构造包含 method、message 和 items 的普通 JavaScript 对象。',
      'res.json() 将它序列化成 JSON 文本，并设置 Content-Type: application/json。',
      '客户端把响应体当 JSON 数据读取；页面同时展示原始文本和类型。',
    ],
    code: "res.json({ method: 'res.json()', items: ['Express', 'React'] });",
    observation: '状态 200、Content-Type 含 application/json，Body 中能看到 method、message 和 items。',
    interpretation: '双引号和数组语法是 JSON 序列化的结果；application/json 告诉客户端按数据解析，而不是执行脚本或渲染页面。',
    comparison: 'res.send() 也能发送对象，但这个例子特意用 res.json() 表明接口意图；res.jsonp() 则把数据包进函数调用，类型和使用方式不同。',
  },
  {
    name: 'res.jsonp()', slug: 'jsonp', description: '发送 JSONP 响应',
    note: '把 JSON 包装成回调函数调用。',
    explanation: 'JSONP 是旧式的跨域脚本方案；需要客户端提供 callback 名称。新接口通常使用 CORS 和 res.json()。',
    steps: [
      '页面请求 /jsonp?callback=showResponse；callback 参数指定要包装的函数名。',
      'res.jsonp() 把对象序列化，然后返回 showResponse({...}) 形式的 JavaScript。',
      '本页只展示脚本文本，不执行它；传统 JSONP 是通过 script 标签加载并调用页面上的同名函数。',
    ],
    code: "res.jsonp({ method: 'res.jsonp()' });",
    observation: 'Body 以 showResponse( 开头，Content-Type 是 JavaScript；与 JSON 示例的纯对象文本对比。',
    interpretation: '括号外的函数名就是 callback 参数的值，因此整段响应是可执行脚本，不是合法的 JSON 文档。本页没有执行返回内容。',
    comparison: 'JSONP 是为旧式跨域脚本加载准备的教学示例，并非新接口的默认选择；现代接口通常用 CORS 配合 res.json()。',
  },
  {
    name: 'res.redirect()', slug: 'redirect', description: '重定向请求',
    note: '告诉客户端改去另一个地址。',
    explanation: '这里用临时重定向把请求指向 JSON 示例。浏览器的 fetch 会自动跟随，因此页面展示的是最终 JSON 响应。',
    steps: [
      'GET /redirect 首先返回 302，Location 指向 /api/response-methods/json。',
      'fetch 默认跟随 Location 再发起一次 GET，第二个路由以 res.json() 返回 200 JSON。',
      '页面拿到的是最终响应，redirected 和 Final URL 表明中间发生过跳转。',
    ],
    code: "res.redirect(302, '/api/response-methods/json');",
    observation: '页面显示最终的 200 JSON、Redirect 标记和最终 URL，而非直接显示中间的 302。',
    interpretation: '200 属于跳转目标，不是 res.redirect() 发出的首个响应。最终响应的 Location 为空也正常；它存在于中间的 302 响应上。',
    comparison: '与 res.send() 直接返回内容不同，redirect 让客户端再请求新地址。想观察 302/Location 可查看浏览器网络面板或用 curl -i 且不带 -L。',
  },
  {
    name: 'res.render()', slug: 'render', description: '渲染视图模板',
    note: '将数据填入服务端模板，返回 HTML。',
    explanation: '适合服务端渲染页面。这个例子使用 EJS，将 title 和 message 注入模板后再发送完整 HTML。',
    steps: [
      '路由将 title 和 message 作为数据交给 EJS 模板。',
      'res.render() 在服务器把数据填入模板，得到完整 HTML 后发送给客户端。',
      '页面先显示 HTML 原文，再用受限 iframe 预览实际渲染效果。',
    ],
    code: "res.render('response-demo', { title, message });",
    observation: '状态 200、Content-Type 含 text/html；Body 中有实际标签和填入的文字，下方可见预览。',
    interpretation: '预览中的内容不是 React 根据 JSON 拼出来的，而是后端已完成模板渲染后返回的 HTML。',
    comparison: 'res.send() 也能发送 HTML 字符串，但 render() 先执行模板，适合服务端页面；res.json() 则返回结构化数据。',
  },
  {
    name: 'res.send()', slug: 'send', description: '发送多种类型的响应',
    note: '直接发送指定内容。',
    explanation: '可以发送字符串、Buffer 或对象。这里显式指定 text/plain 并发送字符串，便于与 JSON 响应对比。',
    steps: [
      '路由调用 res.type("text/plain")，明确将这次响应标为纯文本。',
      'res.send() 把传入的字符串写入响应体并结束本次请求。',
      '浏览器把 Body 当文字读取，不会把这句话解析为 JSON。',
    ],
    code: "res.type('text/plain').send('res.send() 示例文本');",
    observation: '状态 200、Content-Type 含 text/plain，Body 是原始句子。',
    interpretation: 'text/plain 来自显式的 res.type()；send() 负责写内容并结束响应。类型头与内容一起决定客户端如何处理响应。',
    comparison: 'res.json() 自动序列化 JSON 并声明 application/json；send() 用途更宽，这个示例故意限定为字符串，不能推断它只能发送纯文本。',
  },
  {
    name: 'res.sendFile()', slug: 'send-file', description: '发送文件内容',
    note: '直接把磁盘上的文件作为响应发送。',
    explanation: '适合提供可在浏览器中查看的文件。与 download() 不同，这里没有主动设置附件下载头。',
    steps: [
      '路由把示例文件的绝对路径传给 res.sendFile()。',
      'Express 读取文件，依据文件类型设置响应头，把文件字节作为 Body 发送。',
      '页面直接展示读取到的文本，并检查有没有附件下载头。',
    ],
    code: 'res.sendFile(sampleFile);',
    observation: '状态 200、Body 是示例文件内容，Content-Disposition 为空；与 download 示例发送的是同一文件。',
    interpretation: '没有 attachment 说明此路由没有要求浏览器下载；最终是显示还是保存仍可能受文件类型与浏览器设置影响。',
    comparison: 'download() 在文件发送基础上设置附件头和下载文件名；sendFile() 只负责直接发送文件，不强制附件行为。',
  },
  {
    name: 'res.sendStatus()', slug: 'send-status', description: '发送状态码与状态文字',
    note: '一次设置状态码并结束响应。',
    explanation: '适合只需要状态码和简短状态文字的响应。它与 status(code).end() 不同，会写入状态文字作为 Body。',
    steps: [
      '路由调用 res.sendStatus(418) 设置 HTTP 状态。',
      'Express 查找该状态的文字说明，把它写入响应体并结束响应。',
      '页面同时显示状态标签和 Body，以便和 end() 的空响应对照。',
    ],
    code: 'res.sendStatus(418);',
    observation: '状态 418，Body 是对应的状态文字，而不是空字符串。',
    interpretation: '状态码与响应体都来自 sendStatus()；它是“一次发送状态文字”的快捷方法，不仅仅是设置 res.statusCode。',
    comparison: 'res.status(204).end() 不写 Body，适合无内容响应。418 在这里只用于观察行为，并不表示真实业务中应使用这个状态。',
  },
];

export const methodUrl = (slug: string) =>
  `${basePath}/${slug}${slug === 'jsonp' ? '?callback=showResponse' : ''}`;
