export const attributionScript = `
  (function () {
    var ATTRIBUTION_COOKIE_NAME = "anam_attribution";
    var COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
    var ATTRIBUTION_PARAMS = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "gbraid",
      "wbraid",
      "fbclid",
      "ttclid",
      "li_fat_id",
      "twclid",
      "msclkid",
      "igshid",
      "ref",
      "referrer",
      "source",
      "campaign"
    ];

    function getCookieDomain() {
      var hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") return;
      if (hostname === "anam.ai" || hostname.endsWith(".anam.ai")) {
        return ".anam.ai";
      }
    }

    function readStoredAttribution() {
      try {
        var cookies = document.cookie.split(";");
        for (var i = 0; i < cookies.length; i++) {
          var cookie = cookies[i].trim();
          if (cookie.indexOf(ATTRIBUTION_COOKIE_NAME + "=") === 0) {
            return JSON.parse(
              decodeURIComponent(cookie.substring(ATTRIBUTION_COOKIE_NAME.length + 1))
            );
          }
        }
      } catch (error) {}

      return {};
    }

    function writeAttributionCookie(attribution) {
      try {
        var cookieValue = encodeURIComponent(JSON.stringify(attribution));
        var cookieString =
          ATTRIBUTION_COOKIE_NAME +
          "=" +
          cookieValue +
          "; path=/; max-age=" +
          COOKIE_MAX_AGE +
          "; SameSite=Lax";
        var domain = getCookieDomain();

        if (domain) cookieString += "; domain=" + domain;
        if (window.location.protocol === "https:") cookieString += "; Secure";

        document.cookie = cookieString;
      } catch (error) {}
    }

    function buildLinkParams(attribution) {
      var linkParams = {};

      for (var i = 0; i < ATTRIBUTION_PARAMS.length; i++) {
        var key = ATTRIBUTION_PARAMS[i];
        if (attribution[key]) {
          linkParams[key] = attribution[key];
        }
      }

      return linkParams;
    }

    function isLabLink(link) {
      try {
        return new URL(link.href).hostname === "lab.anam.ai";
      } catch (error) {
        return false;
      }
    }

    function decorateLink(link, params) {
      try {
        var url = new URL(link.href);
        var keys = Object.keys(params);

        for (var i = 0; i < keys.length; i++) {
          if (!url.searchParams.has(keys[i])) {
            url.searchParams.set(keys[i], params[keys[i]]);
          }
        }

        link.href = url.toString();
      } catch (error) {}
    }

    function decorateLinks(params, root) {
      var scope = root || document;
      var links = scope.querySelectorAll
        ? scope.querySelectorAll('a[href*="lab.anam.ai"]')
        : [];

      for (var i = 0; i < links.length; i++) {
        if (isLabLink(links[i])) {
          decorateLink(links[i], params);
        }
      }
    }

    var params = new URLSearchParams(window.location.search);
    var freshAttribution = {};
    var hasAttributionParams = false;

    for (var i = 0; i < ATTRIBUTION_PARAMS.length; i++) {
      var key = ATTRIBUTION_PARAMS[i];
      if (params.has(key)) {
        freshAttribution[key] = params.get(key);
        hasAttributionParams = true;
      }
    }

    if (hasAttributionParams) {
      freshAttribution.landing_page = window.location.pathname;
      freshAttribution.page_referrer = document.referrer || "direct";
      freshAttribution.timestamp = new Date().toISOString();
      writeAttributionCookie(freshAttribution);
    }

    var linkParams = buildLinkParams(
      hasAttributionParams ? freshAttribution : readStoredAttribution()
    );

    if (Object.keys(linkParams).length === 0) return;

    decorateLinks(linkParams, document);

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var addedNodes = mutations[i].addedNodes;
        for (var j = 0; j < addedNodes.length; j++) {
          var node = addedNodes[j];
          if (node.nodeType !== 1) continue;

          if (node.tagName === "A" && isLabLink(node)) {
            decorateLink(node, linkParams);
          }

          decorateLinks(linkParams, node);
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  })();
`;
