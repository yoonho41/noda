import React from "react";
import FooterIcon from "../Icons/FooterIcon.js";
import s from "./Footer.module.scss";

const Footer = () => {
  return (
    <div className={s.footer}>
      <span className={s.footerLabel}>2025 &copy; 취업하자</span>
      <FooterIcon />
    </div>
  )
}

export default Footer;

