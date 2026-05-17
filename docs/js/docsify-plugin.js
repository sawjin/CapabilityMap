(function() {
  'use strict';

  const DATA_PATH = 'data/skills.json';
  const TAGS_PATH = 'data/tags.json';

  let skillsData = [];
  let tagsData = [];

  function safeFetch(url) {
    return fetch(url)
      .then(function(res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status + ': ' + url);
        }
        return res.json();
      })
      .catch(function(err) {
        console.error('[CapabilityMap] Fetch error:', err.message);
        return null;
      });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr);
      return d.toLocaleDateString('zh-CN');
    } catch (e) {
      return dateStr;
    }
  }

  function init() {
    Promise.all([safeFetch(DATA_PATH), safeFetch(TAGS_PATH)])
      .then(function(results) {
        if (results[0] && results[0].skills) {
          skillsData = results[0].skills;
        }
        if (results[1] && results[1].tags) {
          tagsData = results[1].tags;
        }
        renderSkillsList();
        renderRecommendedTop5();
        renderTagsFilter();
      });
  }

  function searchSkills(query) {
    if (!query || !skillsData.length) return skillsData;
    var keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
    return skillsData.filter(function(skill) {
      var text = [
        skill.name || '',
        skill.description || '',
        skill.stage || '',
        (skill.tags || []).join(' ')
      ].join(' ').toLowerCase();
      return keywords.every(function(kw) {
        return text.indexOf(kw) >= 0;
      });
    });
  }

  function filterByTag(tag) {
    if (!tag || !skillsData.length) return skillsData;
    return skillsData.filter(function(skill) {
      return (skill.tags || []).indexOf(tag) >= 0;
    });
  }

  function getRecommendedSkills() {
    return skillsData
      .filter(function(s) { return s.isRecommended; })
      .sort(function(a, b) {
        return (a.recommendOrder || 999) - (b.recommendOrder || 999);
      })
      .slice(0, 5);
  }

  function renderSkillCard(skill) {
    var tagsHtml = (skill.tags || []).map(function(t) {
      return '<span class="skill-tag">' + escapeHtml(t) + '</span>';
    }).join('');

    return [
      '<div class="skill-card">',
      '<h3>' + escapeHtml(skill.name) + '</h3>',
      '<p class="skill-desc">' + escapeHtml(skill.description) + '</p>',
      '<div class="skill-meta">',
      '<span class="skill-stage">' + escapeHtml(skill.stage) + '</span>',
      '<span class="skill-author">' + escapeHtml(skill.author) + '</span>',
      '<span class="skill-date">' + formatDate(skill.lastUpdated) + '</span>',
      '</div>',
      '<div class="skill-tags">' + tagsHtml + '</div>',
      '<div class="skill-actions">',
      '<button class="copy-btn" data-cmd="' + escapeHtml(skill.usageCommandExample || skill.usageCommand) + '">复制命令</button>',
      '<a class="git-link" href="' + escapeHtml(skill.gitUrl) + '" target="_blank" rel="noopener noreferrer">Git仓库</a>',
      '</div>',
      '</div>'
    ].join('');
  }

  function renderSkillsList(containerId, skills) {
    var container = document.getElementById(containerId || 'skills-list');
    if (!container) return;

    var list = skills || skillsData;
    if (!list.length) {
      container.innerHTML = '<p class="empty-state">公共Skill正在建设中...</p>';
      return;
    }

    container.innerHTML = list.map(renderSkillCard).join('');
    attachCopyHandlers(container);
  }

  function renderRecommendedTop5() {
    var container = document.getElementById('recommended-list');
    if (!container) return;

    var recommended = getRecommendedSkills();
    if (!recommended.length) {
      container.innerHTML = '<p class="empty-state">暂无推荐Skill</p>';
      return;
    }

    container.innerHTML = recommended.map(renderSkillCard).join('');
    attachCopyHandlers(container);
  }

  function renderTagsFilter() {
    var container = document.getElementById('tags-filter');
    if (!container) return;

    if (!tagsData.length) {
      container.innerHTML = '<p class="empty-state">标签系统建设中...</p>';
      return;
    }

    container.innerHTML = tagsData.map(function(tag) {
      return '<button class="tag-btn" data-tag="' + escapeHtml(tag.name) + '">' + escapeHtml(tag.name) + '</button>';
    }).join('');

    container.querySelectorAll('.tag-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tag = this.getAttribute('data-tag');
        var filtered = filterByTag(tag);
        renderSkillsList('skills-list', filtered);
        document.querySelectorAll('.tag-btn').forEach(function(b) {
          b.classList.remove('active');
        });
        this.classList.add('active');
      });
    });
  }

  function attachCopyHandlers(container) {
    container.querySelectorAll('.copy-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cmd = this.getAttribute('data-cmd');
        copyToClipboard(cmd, this);
      });
    });
  }

  function copyToClipboard(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = '已复制!';
        btn.classList.add('copied');
        setTimeout(function() {
          btn.textContent = '复制命令';
          btn.classList.remove('copied');
        }, 2000);
      }).catch(function(err) {
        console.error('Clipboard error:', err);
        fallbackCopy(text, btn);
      });
    } else {
      fallbackCopy(text, btn);
    }
  }

  function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      btn.textContent = '已复制!';
      btn.classList.add('copied');
      setTimeout(function() {
        btn.textContent = '复制命令';
        btn.classList.remove('copied');
      }, 2000);
    } catch (e) {
      btn.textContent = '复制失败';
    }
    document.body.removeChild(ta);
  }

  function clearActiveTagButtons() {
    document.querySelectorAll('.tag-btn').forEach(function(b) {
      b.classList.remove('active');
    });
  }

  function setupSearch() {
    var input = document.getElementById('skill-search');
    if (!input) return;

    input.addEventListener('input', function() {
      clearActiveTagButtons();
      var query = this.value.trim();
      var results = searchSkills(query);
      if (!results.length && query) {
        document.getElementById('skills-list').innerHTML = '<p class="empty-state">未找到相关Skill，请尝试其他关键词</p>';
      } else {
        renderSkillsList('skills-list', results);
      }
    });
  }

  window.CapabilityMap = {
    init: init,
    search: searchSkills,
    filterByTag: filterByTag,
    render: renderSkillsList
  };

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = window.$docsify.plugins || [];

  window.$docsify.plugins.push(function(hook, vm) {
    hook.ready(function() {
      init();
      setupSearch();
    });
  });

})();
