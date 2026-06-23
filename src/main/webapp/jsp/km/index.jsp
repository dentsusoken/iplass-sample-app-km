<%-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. --%>
<%@ page language="java" contentType="text/html; charset=utf-8" pageEncoding="utf-8" trimDirectiveWhitespaces="true"%>
<%@ page import="org.iplass.mtp.web.template.TemplateUtil"%>
<%@ taglib prefix="m" uri="http://iplass.org/tags/mtp"%>
<!DOCTYPE html>
<html lang="<%=TemplateUtil.getLanguage() %>">
<%
  request.setAttribute("staticContentPath", TemplateUtil.getStaticContentPath());
%>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link rel="stylesheet" href="${m:esc(staticContentPath)}/km/assets/style.css?cv=<%=TemplateUtil.getAPIVersion()%>">
  <script>
    var lang = '<%=TemplateUtil.getLanguage() %>';
    var tcPath = '<%=TemplateUtil.getTenantContextPath() %>';
    var staticContentPath = '${m:esc(staticContentPath)}';
    var __INITIAL_AUTH__ = {
      user: { oid: '<%=request.getAttribute("userOid") %>', name: '<%=request.getAttribute("userName") %>' },
      roles: ['<%=request.getAttribute("roleName") %>']
    };
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="text/javascript" src="${m:esc(staticContentPath)}/km/assets/index.js?cv=<%=TemplateUtil.getAPIVersion()%>"></script>
</body>
</html>
