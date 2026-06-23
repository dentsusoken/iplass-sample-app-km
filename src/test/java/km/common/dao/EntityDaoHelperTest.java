/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import km.tag.entity.Tag;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.GenericEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("EntityDaoHelper")
class EntityDaoHelperTest {

	@Nested
	@DisplayName("toUserRef")
	class ToUserRef {

		@Test
		@DisplayName("returns null for null entity")
		void returnsNullForNull() {
			assertNull(EntityDaoHelper.toUserRef(null));
		}

		@Test
		@DisplayName("returns oid and name map from entity")
		void returnsOidAndName() {
			Entity user = new GenericEntity();
			user.setOid("user001");
			user.setName("Test User");

			Map<String, String> ref = EntityDaoHelper.toUserRef(user);
			assertEquals("user001", ref.get("oid"));
			assertEquals("Test User", ref.get("name"));
		}
	}

	@Nested
	@DisplayName("toTagList")
	class ToTagList {

		@Test
		@DisplayName("returns empty list for null value")
		void returnsEmptyForNull() {
			List<Map<String, String>> result = EntityDaoHelper.toTagList(null);
			assertNotNull(result);
			assertTrue(result.isEmpty());
		}

		@Test
		@DisplayName("converts single Entity to list")
		void convertsSingleEntity() {
			Entity tag = new GenericEntity();
			tag.setOid("tag001");
			tag.setValue(Tag.TAG_NAME, "ProductA");

			List<Map<String, String>> result = EntityDaoHelper.toTagList(tag);
			assertEquals(1, result.size());
			assertEquals("tag001", result.get(0).get("oid"));
			assertEquals("ProductA", result.get(0).get("tagName"));
		}

		@Test
		@DisplayName("converts Entity array to list")
		void convertsEntityArray() {
			Entity tag1 = new GenericEntity();
			tag1.setOid("tag001");
			tag1.setValue(Tag.TAG_NAME, "ProductA");

			Entity tag2 = new GenericEntity();
			tag2.setOid("tag002");
			tag2.setValue(Tag.TAG_NAME, "HowTo");

			Entity[] tags = {tag1, tag2};
			List<Map<String, String>> result = EntityDaoHelper.toTagList(tags);
			assertEquals(2, result.size());
			assertEquals("tag001", result.get(0).get("oid"));
			assertEquals("ProductA", result.get(0).get("tagName"));
			assertEquals("tag002", result.get(1).get("oid"));
			assertEquals("HowTo", result.get(1).get("tagName"));
		}
	}
}
