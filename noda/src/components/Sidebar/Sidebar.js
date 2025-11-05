import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import cn from "classnames";
import s from "./Sidebar.module.scss";
import LinksGroup from "./LinksGroup/LinksGroup";
import { changeActiveSidebarItem } from "../../actions/navigation.js";
import SofiaLogo from "../Icons/SofiaLogo.js";
import "eva-icons/style/eva-icons.css";

const Sidebar = (props) => {

  const {
    activeItem = "",
    ...restProps
  } = props;

  const [burgerBtnToggled, setBurgerBtnToggled] = useState(false);

  useEffect(() => {
    if (props.sidebarOpened) {
      setBurgerBtnToggled(true)
    } else {
      setTimeout(() => {
        setBurgerBtnToggled(false)
      }, 0)
    }
  },  [props.sidebarOpened])

  return (
    <nav className={cn(s.root, {[s.sidebarOpen]: burgerBtnToggled})}>
      <header className={s.logo}>
        <SofiaLogo/>
        <span className={s.title}>SOFIA</span>
      </header>
      <ul className={s.nav}>
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="Dashboard"
          isHeader
          iconName={<i className="eva eva-home-outline"/>}
          link="/template/dashboard"
          index="dashboard"
          badge="9"
        />
        <h5 className={[s.navTitle, s.groupTitle].join(" ")}>TEMPLATE</h5>
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="User"
          isHeader
          iconName={<i className="eva eva-person-outline"/>}
          link="/admin"
          index="admin"
          exact={false}
          childrenLinks={[
            {
              header: 'My Profile', link: '/template/user/profile',
            },
            {
              header: 'User Management', link: '/admin/users',
            },
            {
              header: 'Edit Profile', link: '/template/edit_profile',
            },
            {
              header: 'Change Password', link: '/template/password'
            },
          ]}
        />        
       
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="Calendar"
          isHeader
          iconName={<i className="eva eva-calendar-outline"/>}
          link={"/template/calendar"}
          index="calendar"
        />

         {/* 임의 추가 */}
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="메세지"
          isHeader
          iconName={<i className="eva eva-email-outline"/>}
          link={"/template/message"}
          index="calendar"
        />
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="회의실 예약"
          isHeader
          iconName={<i className="eva eva-monitor-outline"/>}
          link={"/template/reservation"}
          index="calendar"
        />
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="뉴스"
          isHeader
          iconName={<i className="eva eva-globe-outline"/>}
          link={"/template/news"}
          index="news"
        />




        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="Tables"
          isHeader
          iconName={<i className="eva eva-grid-outline"/>}
          link="/template/tables"
          index="tables"
        />
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="Maps"
          isHeader
          iconName={<i className="eva eva-map-outline"/>}
          link="/template/maps"
          index="maps"
          childrenLinks={[
            {
              header: 'Google Maps', link: '/template/maps/google',
            },
            {
              header: 'Vector Map', link: '/template/maps/vector',
            },
          ]}
        />
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="Extra"
          isHeader
          iconName={<i className="eva eva-star-outline"/>}
          link="/template/extra"
          index="extra"
          childrenLinks={[
            {
              header: 'Charts', link: '/template/extra/charts',
            },
            {
              header: 'Login Page', link: '/template/extra/login',
            },
            {
              header: 'Register Page', link: '/template/extra/register',
            },
            {
              header: 'Error Page', link: '/template/extra/error',
            },
          ]}
        />
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="AI 비서"
          link="/template/ai"
          isHeader
          iconName={<i className="eva eva-book-open-outline"/>}
          index="documentation"       
          labelColor="success"
        />
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="dash"
          link="/template/dashboard"
          isHeader
          iconName={<i className="eva eva-book-open-outline"/>}
          index="documentation"       
          labelColor="success"
        />
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="manager"
          link="/template/manager"
          isHeader
          iconName={<i className="eva eva-book-open-outline"/>}
          index="documentation"       
          labelColor="success"
        />
        <LinksGroup
          onActiveSidebarItemChange={activeItem => props.dispatch(changeActiveSidebarItem(activeItem))}
          activeItem={props.activeItem}
          header="admin"
          link="/template/admin"
          isHeader
          iconName={<i className="eva eva-book-open-outline"/>}
          index="documentation"       
          labelColor="success"
        />
      </ul>
    </nav>
  );
}



Sidebar.propTypes = {
  sidebarOpened: PropTypes.bool,
  dispatch: PropTypes.func.isRequired,
  activeItem: PropTypes.string,
  location: PropTypes.shape({
    pathname: PropTypes.string,
  }).isRequired
}

function mapStateToProps(store) {
  return {
    sidebarOpened: store.navigation.sidebarOpened,
    activeItem: store.navigation.activeItem,
  };
};

export default withRouter(connect(mapStateToProps)(Sidebar));
