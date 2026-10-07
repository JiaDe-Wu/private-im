import { MediaMessageContent } from "wukongimjssdk"
import React from "react"
import WKApp from "../../App"
import { MessageContentTypeConst } from "../../Service/Const"
import MessageBase from "../Base"
import { MessageCell } from "../MessageCell"
import { PsLightbox } from "../../Components/PsLightbox";


export class ImageContent extends MediaMessageContent {
    width!: number
    height!: number
    url!: string
    imgData?: string
    constructor(file?: File, imgData?: string, width?: number, height?: number) {
        super()
        this.file = file
        this.imgData = imgData
        this.width = width || 0
        this.height = height || 0
    }
    decodeJSON(content: any) {
        this.width = content["width"] || 0
        this.height = content["height"] || 0
        this.url = content["url"] || ''
        this.remoteUrl = this.url
    }
    encodeJSON() {
        return { "width": this.width || 0, "height": this.height || 0, "url": this.remoteUrl || "" }
    }
    get contentType() {
        return MessageContentTypeConst.image
    }
    get conversationDigest() {
        return "[图片]"
    }
}


interface ImageCellState {
    showPreview: boolean
}

export class ImageCell extends MessageCell<any, ImageCellState> {

    constructor(props: any) {
        super(props)
        this.state = {
            showPreview: false,
        }
    }

    imageScale(orgWidth: number, orgHeight: number, maxWidth = 250, maxHeight = 250) {
        let actSize = { width: orgWidth, height: orgHeight };
        if (orgWidth > orgHeight) {//横图
            if (orgWidth > maxWidth) { // 横图超过最大宽度
                let rate = maxWidth / orgWidth; // 缩放比例
                actSize.width = maxWidth;
                actSize.height = orgHeight * rate;
            }
        } else if (orgWidth < orgHeight) { //竖图
            if (orgHeight > maxHeight) {
                let rate = maxHeight / orgHeight; // 缩放比例
                actSize.width = orgWidth * rate;
                actSize.height = maxHeight;
            }
        } else if (orgWidth === orgHeight) {
            if (orgWidth > maxWidth) {
                let rate = maxWidth / orgWidth; // 缩放比例
                actSize.width = maxWidth;
                actSize.height = orgHeight * rate;
            }
        }
        return actSize;
    }

    getImageSrc(content: ImageContent) {
        if (content.url && content.url !== "") { // 等待发送的消息
            let downloadURL = WKApp.dataSource.commonDataSource.getImageURL(content.url, { width: content.width, height: content.height })
            if (downloadURL.indexOf("?") != -1) {
                downloadURL += "&filename=image.png"
            } else {
                downloadURL += "?filename=image.png"
            }
            return downloadURL
        }
        return content.imgData
    }

    getImageElement() {
        const { message } = this.props
        const content = message.content as ImageContent
        let scaleSize = this.imageScale(content.width, content.height);
        // 加载完成后淡入（ps-img-loaded，见 pitchshow-motion.css）
        return <img alt="" className="ps-img-fade" src={this.getImageSrc(content)} style={{ width: scaleSize.width, height: scaleSize.height }}
            onLoad={(e) => e.currentTarget.classList.add("ps-img-loaded")} />
    }

    render() {
        const { message, context } = this.props
        const content = message.content as ImageContent
        let scaleSize = this.imageScale(content.width, content.height);
        const imageURL = this.getImageSrc(content) || ""
        return <MessageBase context={context} message={message}>
            <div className="wk-message-image" style={{ width: scaleSize.width, height: scaleSize.height, cursor: "zoom-in" }} onClick={(e) => {
                const el = e.currentTarget
                PsLightbox.open({ images: [{ src: imageURL, width: content.width, height: content.height }], getSource: () => el })
            }}>
                {this.getImageElement()}
            </div>
        </MessageBase>
    }
}