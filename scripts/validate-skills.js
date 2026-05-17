const fs = require('fs');
const path = require('path');

function validate() {
  const dataPath = path.join(__dirname, '..', 'docs', 'data', 'skills.json');
  const schemaPath = path.join(__dirname, '..', 'docs', 'data', 'skills.schema.json');
  const tagsPath = path.join(__dirname, '..', 'docs', 'data', 'tags.json');

  let errors = [];
  let validTags = [];

  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const tagsData = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));

    if (tagsData && tagsData.tags && Array.isArray(tagsData.tags)) {
      validTags = tagsData.tags.map(t => t.name);
    }

    if (!data.skills || !Array.isArray(data.skills)) {
      errors.push('Missing or invalid "skills" array');
      return errors;
    }

    const validStages = ['需求阶段', '设计阶段', '编码阶段', '测试阶段', '部署阶段'];
    const idPattern = /^skill-[a-z0-9-]+$/;
    const versionPattern = /^v[0-9]+\.[0-9]+\.[0-9]+$/;
    const datePattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
    const urlPattern = /^https?:\/\/.+$/;

    data.skills.forEach((skill, idx) => {
      const prefix = `skills[${idx}]`;

      if (!skill.id) {
        errors.push(`${prefix}: missing "id"`);
      } else if (!idPattern.test(skill.id)) {
        errors.push(`${prefix}: invalid id format "${skill.id}" (expected skill-xxx)`);
      }

      if (!skill.name) errors.push(`${prefix}: missing "name"`);
      if (!skill.description) errors.push(`${prefix}: missing "description"`);
      if (!skill.author) errors.push(`${prefix}: missing "author"`);
      if (!skill.usageCommand) errors.push(`${prefix}: missing "usageCommand"`);

      if (!skill.stage) {
        errors.push(`${prefix}: missing "stage"`);
      } else if (!validStages.includes(skill.stage)) {
        errors.push(`${prefix}: invalid stage "${skill.stage}"`);
      }

      if (!skill.lastUpdated) {
        errors.push(`${prefix}: missing "lastUpdated"`);
      } else if (!datePattern.test(skill.lastUpdated)) {
        errors.push(`${prefix}: invalid date format "${skill.lastUpdated}"`);
      }

      if (!skill.gitUrl) {
        errors.push(`${prefix}: missing "gitUrl"`);
      } else if (!urlPattern.test(skill.gitUrl)) {
        errors.push(`${prefix}: invalid URL format "${skill.gitUrl}"`);
      }

      if (skill.version && !versionPattern.test(skill.version)) {
        errors.push(`${prefix}: invalid version format "${skill.version}"`);
      }

      if (skill.isRecommended && (!skill.recommendOrder || skill.recommendOrder < 1)) {
        errors.push(`${prefix}: recommended skill needs valid recommendOrder`);
      }

      if (skill.tags && Array.isArray(skill.tags)) {
        skill.tags.forEach(tag => {
          if (validTags.length && !validTags.includes(tag)) {
            errors.push(`${prefix}: unknown tag "${tag}" (not found in tags.json)`);
          }
        });
      }
    });

    const ids = data.skills.map(s => s.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length) {
      errors.push(`Duplicate IDs found: ${duplicates.join(', ')}`);
    }

  } catch (e) {
    errors.push(`Parse error: ${e.message}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error('Validation FAILED:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('Validation PASSED: skills.json is valid');
  process.exit(0);
}