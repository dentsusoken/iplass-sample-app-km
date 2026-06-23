/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import static km.common.command.CommandTestHelper.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.BinaryReference;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.query.Query;
import org.iplass.mtp.test.AuthUser;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("InquiryDetailCommand")
class InquiryDetailCommandTest {

	private InquiryDetailCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new InquiryDetailCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Nested
	@DisplayName("エラー条件")
	class ErrorConditions {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("存在しない問合せはINQUIRY_NOT_FOUND")
		@SuppressWarnings("unchecked")
		void errorWhenNotFound() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq999");

			SearchResult<Entity> emptyResult = mock(SearchResult.class);
			when(emptyResult.getList()).thenReturn(List.of());
			when(em.searchEntity(any(Query.class))).thenReturn(emptyResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "INQUIRY_NOT_FOUND");
		}
	}

	@Nested
	@DisplayName("アクセス制御")
	class AccessControl {

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("一般ユーザーも問合せ詳細を参照できる")
		@SuppressWarnings("unchecked")
		void nonResponderCanAccessDetail() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");

			Entity inquiry = createInquiry("inq001", "Open", "Test Inquiry", "user001");
			SearchResult<Entity> inquiryResult = mock(SearchResult.class);
			when(inquiryResult.getList()).thenReturn(List.of(inquiry));
			when(inquiryResult.getFirst()).thenReturn(inquiry);

			SearchResult<Entity> tagResult = mock(SearchResult.class);
			when(tagResult.getList()).thenReturn(List.of());

			SearchResult<Entity> postResult = mock(SearchResult.class);
			when(postResult.getList()).thenReturn(List.of());

			when(em.searchEntity(any(Query.class)))
					.thenReturn(inquiryResult)
					.thenReturn(tagResult)
					.thenReturn(postResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
		}
	}

	@Nested
	@DisplayName("詳細取得")
	class DetailRetrieval {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("問合せ情報と投稿一覧が取得できる")
		@SuppressWarnings("unchecked")
		void returnsDetailWithPosts() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");

			Entity inquiry = createInquiry("inq001", "Open", "Test Inquiry", "user001");
			SearchResult<Entity> inquiryResult = mock(SearchResult.class);
			when(inquiryResult.getList()).thenReturn(List.of(inquiry));
			when(inquiryResult.getFirst()).thenReturn(inquiry);

			SearchResult<Entity> tagResult = mock(SearchResult.class);
			when(tagResult.getList()).thenReturn(List.of());

			Entity inquiryWithPost = createInquiry("inq001", "Open", "Test Inquiry", "user001");
			Entity postEntity = new GenericEntity("km.inquiry.Post");
			postEntity.setOid("post001");
			postEntity.setValue("content", "First post");
			postEntity.setValue("createBy", "user001");
			postEntity.setValue("createDate", null);
			postEntity.setValue("updateDate", null);
			postEntity.setValue("attachments", null);
			inquiryWithPost.setValue("posts", postEntity);

			SearchResult<Entity> postPathResult = mock(SearchResult.class);
			when(postPathResult.getList()).thenReturn(List.of(inquiryWithPost));

			when(em.searchEntity(any(Query.class)))
					.thenReturn(inquiryResult)
					.thenReturn(tagResult)
					.thenReturn(postPathResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
			verify(em, times(3)).searchEntity(any(Query.class));

			ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
			verify(request).setAttribute(eq("result"), captor.capture());
			Map<String, Object> response = captor.getValue();
			assertEquals("SUCCESS", response.get("status"));

			Map<String, Object> data = (Map<String, Object>) response.get("data");
			assertEquals("inq001", data.get("oid"));
			assertEquals("Test Inquiry", data.get("name"));
			assertEquals("Open", data.get("status"));
			// summaryShort と summaryDetail はどちらも返る (テストヘルパーからは null)
			assertTrue(data.containsKey("summaryShort"));
			assertTrue(data.containsKey("summaryDetail"));

			List<Map<String, Object>> posts = (List<Map<String, Object>>) data.get("posts");
			assertEquals(1, posts.size());
			assertEquals("post001", posts.get(0).get("oid"));
			assertEquals("First post", posts.get(0).get("content"));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("投稿の添付ファイル情報が取得できる")
		@SuppressWarnings("unchecked")
		void handlesAttachments() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");

			Entity inquiry = createInquiry("inq001", "Open", "Test", "user001");
			SearchResult<Entity> inquiryResult = mock(SearchResult.class);
			when(inquiryResult.getList()).thenReturn(List.of(inquiry));
			when(inquiryResult.getFirst()).thenReturn(inquiry);

			SearchResult<Entity> tagResult = mock(SearchResult.class);
			when(tagResult.getList()).thenReturn(List.of());

			Entity inquiryWithPost = createInquiry("inq001", "Open", "Test", "user001");
			Entity postEntity = new GenericEntity("km.inquiry.Post");
			postEntity.setOid("post001");
			postEntity.setValue("content", "Content with file");
			postEntity.setValue("createBy", "user001");
			postEntity.setValue("createDate", null);
			postEntity.setValue("updateDate", null);

			BinaryReference binRef = mock(BinaryReference.class);
			when(binRef.getName()).thenReturn("document.pdf");
			when(binRef.getLobId()).thenReturn(12345L);
			when(binRef.getType()).thenReturn("application/pdf");
			postEntity.setValue("attachments", new BinaryReference[] {binRef});
			inquiryWithPost.setValue("posts", postEntity);

			SearchResult<Entity> postPathResult = mock(SearchResult.class);
			when(postPathResult.getList()).thenReturn(List.of(inquiryWithPost));

			when(em.searchEntity(any(Query.class)))
					.thenReturn(inquiryResult)
					.thenReturn(tagResult)
					.thenReturn(postPathResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
			verify(request).setAttribute(eq("result"), captor.capture());
			Map<String, Object> response = captor.getValue();

			Map<String, Object> data = (Map<String, Object>) response.get("data");
			List<Map<String, Object>> posts = (List<Map<String, Object>>) data.get("posts");
			List<Map<String, Object>> attachments =
					(List<Map<String, Object>>) posts.get(0).get("attachments");
			assertEquals(1, attachments.size());
			assertEquals("document.pdf", attachments.get(0).get("name"));
			assertEquals("12345", attachments.get(0).get("lobId"));
			assertEquals("application/pdf", attachments.get(0).get("type"));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("複数タグが全件取得できる")
		@SuppressWarnings("unchecked")
		void returnsMultipleTags() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");

			Entity inquiry = createInquiry("inq001", "Open", "Test Inquiry", "user001");
			SearchResult<Entity> inquiryResult = mock(SearchResult.class);
			when(inquiryResult.getList()).thenReturn(List.of(inquiry));
			when(inquiryResult.getFirst()).thenReturn(inquiry);

			// タグクエリは 3 行返す (タグごとに 1 行)
			Entity tagRow1 = new GenericEntity("km.inquiry.Inquiry");
			tagRow1.setValue("tags.oid", "tag001");
			tagRow1.setValue("tags.tagName", "Java");
			Entity tagRow2 = new GenericEntity("km.inquiry.Inquiry");
			tagRow2.setValue("tags.oid", "tag002");
			tagRow2.setValue("tags.tagName", "Spring");
			Entity tagRow3 = new GenericEntity("km.inquiry.Inquiry");
			tagRow3.setValue("tags.oid", "tag003");
			tagRow3.setValue("tags.tagName", "iPLAss");
			SearchResult<Entity> tagResult = mock(SearchResult.class);
			when(tagResult.getList()).thenReturn(List.of(tagRow1, tagRow2, tagRow3));

			SearchResult<Entity> postResult = mock(SearchResult.class);
			when(postResult.getList()).thenReturn(List.of());

			when(em.searchEntity(any(Query.class)))
					.thenReturn(inquiryResult)
					.thenReturn(tagResult)
					.thenReturn(postResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
			verify(em, times(3)).searchEntity(any(Query.class));

			ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
			verify(request).setAttribute(eq("result"), captor.capture());
			Map<String, Object> response = captor.getValue();
			Map<String, Object> data = (Map<String, Object>) response.get("data");
			List<Map<String, String>> tags = (List<Map<String, String>>) data.get("tags");
			assertEquals(3, tags.size());
			assertEquals("tag001", tags.get(0).get("oid"));
			assertEquals("Java", tags.get(0).get("tagName"));
			assertEquals("tag002", tags.get(1).get("oid"));
			assertEquals("Spring", tags.get(1).get("tagName"));
			assertEquals("tag003", tags.get(2).get("oid"));
			assertEquals("iPLAss", tags.get(2).get("tagName"));
		}
	}
}
