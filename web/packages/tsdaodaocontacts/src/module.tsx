import {
  EndpointCategory,
  IModule,
  WKApp,
} from "@tsdaodao/base";
import {
  ChannelTypePerson,
} from "wukongimjssdk";
import React from "react";
import ReactDOM from "react-dom";
import Blacklist from "./Blacklist";
import { EntryTile, Icons } from "./ui";
import { FriendAdd } from "./FriendAdd";
import GroupSave from "./GroupSave";
import { NewFriend } from "./NewFriend";
import { ContactsListManager } from "./Service/ContactsListManager";
import { OrganizationalGroupNew, OrganizationalGroupNewAction } from "./Organizational/GroupNew/index";

export default class ContactsModule implements IModule {
  id(): string {
    return "ContactsModule";
  }
  init(): void {
    console.log("【ContactsModule】初始化");

    WKApp.endpointManager.setMethod(
      "contacts.friendapply.change",
      () => {
        ContactsListManager.shared.refreshList();
      },
      {
        category: EndpointCategory.friendApplyDataChange,
      }
    );

    // 获取好友未申请添加数量
    // let unreadCount = 0;
    // if(WKApp.loginInfo.isLogined()){
    //   WKApp.apiClient.get(`/user/reddot/friendApply`).then(res=>{
    //     unreadCount = res.count;
    //     console.log('====', unreadCount)
    //     WKApp.mittBus.emit('friend-applys-unread-count', unreadCount)
    //     WKApp.menus.refresh();
    //   })
    // }

    // 通讯录顶部入口（PitchShow 风格紫色图标方块）
    WKApp.endpoints.registerContactsHeader("friends.new", () => (
      <EntryTile icon={Icons.userPlus} title="新的朋友" badge={WKApp.shared.getFriendApplysUnreadCount()}
        onClick={() => WKApp.routeLeft.push(<NewFriend />)} />
    ));
    WKApp.endpoints.registerContactsHeader("groups.save", () => (
      <EntryTile icon={Icons.users} title="群聊" onClick={() => WKApp.routeLeft.push(<GroupSave />)} />
    ));
    WKApp.endpoints.registerContactsHeader("contacts.blacklist", () => (
      <EntryTile icon={Icons.ban} title="黑名单" onClick={() => WKApp.routeLeft.push(<Blacklist />)} />
    ));

    WKApp.shared.chatMenusRegister("chatmenus.addfriend", (param) => {
      return {
        title: "添加朋友",
        icon: require("./assets/menu_friendadd.svg").default,
        onClick: () => {
          WKApp.routeLeft.push(
            <FriendAdd
              onBack={() => {
                WKApp.routeLeft.pop();
              }}
            ></FriendAdd>
          );
        },
      };
    });
    // this.registerOrganizational();

    WKApp.endpoints.registerOrganizationalTool(
      "contacts.organizational.group.add",
      (param) => {
        const channel = param.channel as any;
        const action = channel.channelType === ChannelTypePerson
          ? OrganizationalGroupNewAction.createGroup
          : OrganizationalGroupNewAction.AddMember;
        return (
          <OrganizationalGroupNew channel={channel} render={param.render} action={action} />
        );
      }
    );

    WKApp.endpoints.registerOrganizationalLayer(
      "contacts.organizational.layer",
      (param) => {
        const channel = param.channel as any;
        const div = document.createElement("div");
        const ref: any = React.createRef();
        document.body.appendChild(div);

        const remove = () => {
          if (!ref.current) return;
          ReactDOM.unmountComponentAtNode(div);
          document.body.removeChild(div);
        };

        ReactDOM.render(
          <OrganizationalGroupNew
            ref={ref}
            channel={channel}
            remove={remove}
            action={OrganizationalGroupNewAction.createGroup}
          />,
          div
        );

        ref.current.onShowModal();
      }
    );
  }
}