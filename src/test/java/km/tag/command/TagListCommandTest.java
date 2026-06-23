/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.tag.command;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;
import km.tag.entity.Tag;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.query.Query;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("TagListCommand")
class TagListCommandTest {

	private TagListCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new TagListCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Test
	@DisplayName("returns all tags ordered by name (no params)")
	@SuppressWarnings("unchecked") // Mockito の mock()/forClass() は型消去により raw 型を返すため不可避
	void returnsAllTags() {
		MTPTest.setManagerMock(EntityManager.class, em);
		Entity tag1 = new GenericEntity(Tag.DEFINITION_NAME);
		tag1.setOid("tag001");
		tag1.setValue(Tag.TAG_NAME, "HowTo");

		Entity tag2 = new GenericEntity(Tag.DEFINITION_NAME);
		tag2.setOid("tag002");
		tag2.setValue(Tag.TAG_NAME, "ProductA");

		SearchResult<Entity> searchResult = mock(SearchResult.class);
		when(searchResult.getList()).thenReturn(List.of(tag1, tag2));
		when(em.searchEntity(any(Query.class))).thenReturn(searchResult);

		String result = MTPTest.invokeCommand(command, request);

		assertEquals("SUCCESS", result);

		ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
		verify(request).setAttribute(eq("result"), captor.capture());

		Map<String, Object> response = captor.getValue();
		assertEquals("SUCCESS", response.get("status"));

		List<Map<String, String>> data = (List<Map<String, String>>) response.get("data");
		assertEquals(2, data.size());
		assertEquals("tag001", data.get(0).get("oid"));
		assertEquals("HowTo", data.get(0).get("tagName"));
		assertEquals("tag002", data.get(1).get("oid"));
		assertEquals("ProductA", data.get(1).get("tagName"));
	}

	@Test
	@DisplayName("returns empty list when no tags exist")
	@SuppressWarnings("unchecked") // Mockito の mock()/forClass() は型消去により raw 型を返すため不可避
	void returnsEmptyList() {
		MTPTest.setManagerMock(EntityManager.class, em);
		SearchResult<Entity> searchResult = mock(SearchResult.class);
		when(searchResult.getList()).thenReturn(List.of());
		when(em.searchEntity(any(Query.class))).thenReturn(searchResult);

		String result = MTPTest.invokeCommand(command, request);

		assertEquals("SUCCESS", result);

		ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
		verify(request).setAttribute(eq("result"), captor.capture());

		Map<String, Object> response = captor.getValue();
		List<Map<String, String>> data = (List<Map<String, String>>) response.get("data");
		assertTrue(data.isEmpty());
	}

	/**
	 * keyword / oids / offset / limit の EQL 妥当性とページングメタデータを実コンテナで裏取りする。
	 * モック EM では Like / In / limit / count の実挙動が検証できないため
	 * （モック EM はバリデーションや制約を実行しない）、InquiryListCommandTest と同方式で実 EQL を流す。
	 */
	@Nested
	@DisplayName("keyword / oids / pagination (real container)")
	class SearchAndPagination {

		@Test
		@DisplayName("keyword を指定しても tagName 部分一致の EQL が valid")
		void appliesKeywordFilter() {
			RequestContext req = mock(RequestContext.class);
			when(req.getParam("keyword")).thenReturn("Pro");

			String result = MTPTest.invokeCommand(new TagListCommand(), req);

			assertEquals("SUCCESS", result);
		}

		@Test
		@DisplayName("oids を指定しても該当 oid のみ取得する IN の EQL が valid")
		void appliesOidsFilter() {
			RequestContext req = mock(RequestContext.class);
			when(req.getParams("oids")).thenReturn(new String[] {"tag-001", "tag-002"});

			String result = MTPTest.invokeCommand(new TagListCommand(), req);

			assertEquals("SUCCESS", result);
		}

		@Test
		@DisplayName("offset/limit でページングし offset/limit/totalCount を返す")
		@SuppressWarnings("unchecked")
		void appliesPagination() {
			RequestContext req = mock(RequestContext.class);
			when(req.getParam("limit")).thenReturn("10");
			when(req.getParam("offset")).thenReturn("0");

			String result = MTPTest.invokeCommand(new TagListCommand(), req);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
			verify(req).setAttribute(eq("result"), captor.capture());
			Map<String, Object> response = captor.getValue();
			assertEquals(0, response.get("offset"));
			assertEquals(10, response.get("limit"));
			assertNotNull(response.get("totalCount"));
			assertNotNull(response.get("data"));
		}
	}
}
