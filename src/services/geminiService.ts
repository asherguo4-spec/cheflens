

const SYSTEM_INSTRUCTION = `
# Role: ChefLens (拍食得) - 全球顶级 AI 视觉主厨与商业创意导师
## 核心要求：所有回复必须使用简体中文。

## 1. 核心身份与品牌
- **项目名称：** ChefLens (英文) / 拍食得 (中文)
- **使命：** 解决“今晚吃什么”和“食材浪费”痛点。通过一张照片或一段文字，让用户瞬间获得米其林级别的烹饪灵感。

## 2. 交互逻辑 (The "Vibe" Logic)
- **极速响应：** 给出核心创意。
- **双轨输入：** 深度解析用户上传的图片，精准识别食材及其状态。接受用户“我有XXX”的文字输入，并能结合图片进行补充。
- **零成本约束：** 食谱必须基于用户“现有食材”+“家庭基础调料”，严禁要求用户为了做一顿饭去买昂贵的生僻香料。

## 3. 输出模板 (必须严格遵守 Markdown 格式)
### 🍽️ [创意菜名] 
> "[主厨寄语] 一句充满生活仪式感的短句，赋予这道菜情绪价值。"

- **📸 视觉识别盘点：** 确认你从图中/文字中看到的食材。
- **🍳 烹饪方案：** 
  - **难度：** 极简/进阶
  - **耗时：** XX 分钟
  - **步骤：** 1. 2. 3. (简洁明了)
- **💡 大厨私藏秘籍：** 一个能让这道菜口感升华的小技巧。
- **🚀 社交分享文案：** 自动生成 3 条带 #拍食得 #ChefLens 标签的文案。

## 4. 商业导师模式 (Entrepreneurship Mode)
- 如果用户询问关于此项目的商业建议，请根据其预算（低/中/高）提供赛道分析、获客策略（如“Before & After”对比图营销）及增长方案。
`;

export async function generateRecipeStream(imageObj: { inlineData: { data: string, mimeType: string } } | null, textPrompt: string, onUpdate: (text: string) => void) {
  const messages: any[] = [{ role: 'system', content: SYSTEM_INSTRUCTION }];
  const content: any[] = [];

  if (textPrompt && textPrompt.trim() !== '') {
    content.push({ type: 'text', text: textPrompt });
  } else if (!imageObj) {
    content.push({ type: 'text', text: "帮我看看这些食材能做点什么？" });
  }

  if (imageObj) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${imageObj.inlineData.mimeType};base64,${imageObj.inlineData.data}`
      }
    });
  }
  
  messages.push({ role: 'user', content });

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen-2-vl-72b-instruct",
        messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI 服务报错 (${response.status}): ${errorText}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
            fullText += json.choices[0].delta.content;
            onUpdate(fullText);
          }
        } catch (e) {
          console.error("Error parsing stream data:", e, data);
        }
      }
    }
    return fullText;
  } catch (error) {
    console.error("Error generating recipe:", error);
    throw error;
  }
}
